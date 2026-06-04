import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import PageHeader from '../components/ui/PageHeader';
import EstimateForm from '../components/estimates/EstimateForm';

export default function NewEstimate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: '',
    template_id: '',
    vendor_id: '',
    design_mode: '',
    head_count: '',
    riser_count: '',
    proposal_markup_pct: 25,
    target_margin_pct: null,
    price_escalation_pct: null,
    price_escalation_note: '',
    notes: '',
  });
  
  const [useTargetMargin, setUseTargetMargin] = useState(false);
  const [error, setError] = useState('');

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.Template.filter({ is_active: true }),
  });

  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.filter({ is_active: true }),
  });

  const { data: templateItems = [] } = useQuery({
    queryKey: ['templateItems', formData.template_id],
    queryFn: () => base44.entities.TemplateItem.filter({ 
      template_id: formData.template_id,
      is_active: true 
    }),
    enabled: !!formData.template_id,
  });

  const { data: templateRules = [] } = useQuery({
    queryKey: ['templateRules', formData.template_id],
    queryFn: async () => {
      if (!templateItems.length) return [];
      const itemIds = templateItems.map(i => i.id);
      const allRules = await base44.entities.TemplateItemRule.filter({ is_active: true });
      return allRules.filter(r => itemIds.includes(r.template_item_id));
    },
    enabled: templateItems.length > 0,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_active: true }),
  });

  const { data: vendorCosts = [] } = useQuery({
    queryKey: ['vendorCosts', formData.vendor_id],
    queryFn: () => base44.entities.VendorUnitCostHistory.filter({ 
      vendor_id: formData.vendor_id,
      is_current: true 
    }),
    enabled: !!formData.vendor_id,
  });

  const createEstimateMutation = useMutation({
    mutationFn: async (data) => {
      // Generate estimate number
      const timestamp = Date.now().toString(36).toUpperCase();
      const estimateNumber = `EST-${timestamp}`;

      // Calculate pricing
      const selectedTemplate = templates.find(t => t.id === data.template_id);

      // Build product lookup maps
      const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      const vendorCostMap = vendorCosts.reduce((acc, vc) => {
        acc[vc.product_id] = vc.unit_cost;
        return acc;
      }, {});

      // Build rules lookup
      const rulesMap = {};
      templateRules.forEach(rule => {
        if (!rulesMap[rule.template_item_id]) {
          rulesMap[rule.template_item_id] = { include: [], exclude: [] };
        }
        if (rule.rule_type === 'Include') {
          rulesMap[rule.template_item_id].include.push(rule);
        } else {
          rulesMap[rule.template_item_id].exclude.push(rule);
        }
      });

      // Filter template items based on inclusion rules
      const filteredItems = templateItems.filter(item => {
        const rules = rulesMap[item.id] || { include: [], exclude: [] };
        
        // Check exclude rules first - if any match, exclude the item
        for (const rule of rules.exclude) {
          if (rule.condition_type === 'Vendor' && rule.condition_value === data.vendor_id) {
            return false;
          }
          if (rule.condition_type === 'DesignMode' && rule.condition_value === data.design_mode) {
            return false;
          }
        }
        
        // If include rules exist, at least one must match
        if (rules.include.length > 0) {
          const hasMatch = rules.include.some(rule => {
            if (rule.condition_type === 'Vendor' && rule.condition_value === data.vendor_id) {
              return true;
            }
            if (rule.condition_type === 'DesignMode' && rule.condition_value === data.design_mode) {
              return true;
            }
            return false;
          });
          if (!hasMatch) return false;
        }
        
        return true;
      });

      // Calculate effective markup
      let effectiveMarkupPct;
      if (data.target_margin_pct && data.target_margin_pct > 0) {
        // Convert target margin to markup: markup = margin / (1 - margin)
        const marginDecimal = data.target_margin_pct / 100;
        effectiveMarkupPct = (marginDecimal / (1 - marginDecimal)) * 100;
      } else {
        effectiveMarkupPct = data.proposal_markup_pct || selectedTemplate?.default_markup_pct || 25;
      }

      // Generate estimate lines
      const estimateLines = [];
      const categoryTotals = {
        Materials: 0,
        Labor: 0,
        Equipment: 0,
        Miscellanea: 0,
        Subcontractor: 0,
      };

      for (const item of filteredItems) {
        const product = productMap[item.product_id];
        if (!product) continue;

        // Calculate quantity based on basis
        let quantity;
        switch (item.basis) {
          case 'PerHead':
            quantity = (item.base_factor || 1) * data.head_count;
            break;
          case 'PerRiser':
            quantity = (item.base_factor || 1) * data.riser_count;
            break;
          case 'PerProject':
            quantity = item.fixed_project_qty || 1;
            break;
          default:
            quantity = 1;
        }

        // Apply rounding
        if (item.round_rule === 'Ceiling') {
          quantity = Math.ceil(quantity);
        }

        // Get unit cost (vendor-specific or default)
        const unitCost = vendorCostMap[item.product_id] || product.default_unit_cost || 0;
        const extendedCost = quantity * unitCost;

        // Apply item-level markup (if override exists) or template markup
        const itemMarkup = item.markup_pct_override ?? effectiveMarkupPct;
        const lineUnitSalePrice = unitCost * (1 + itemMarkup / 100);
        const extendedSalePrice = quantity * lineUnitSalePrice;

        estimateLines.push({
          template_item_id: item.id,
          product_id: item.product_id,
          display_name: item.display_name,
          cost_category: item.cost_category,
          quantity,
          unit_cost: unitCost,
          extended_cost: extendedCost,
          item_markup_pct_applied: itemMarkup,
          line_unit_sale_price: lineUnitSalePrice,
          extended_sale_price: extendedSalePrice,
          is_active: true,
        });

        categoryTotals[item.cost_category] += extendedCost;
      }

      // Calculate totals
      const totalCost = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
      const escalationPct = data.price_escalation_pct || 0;
      const effectiveCost = totalCost * (1 + escalationPct / 100);
      const proposalSalePrice = effectiveCost * (1 + effectiveMarkupPct / 100);
      const marginPct = proposalSalePrice > 0 
        ? ((proposalSalePrice - effectiveCost) / proposalSalePrice) * 100 
        : 0;

      // Create estimate header
      const estimate = await base44.entities.Estimate.create({
        estimate_number: estimateNumber,
        name: data.name || `Estimate ${estimateNumber}`,
        template_id: data.template_id,
        head_count: data.head_count,
        riser_count: data.riser_count,
        vendor_id: data.vendor_id,
        design_mode: data.design_mode,
        price_escalation_pct: data.price_escalation_pct,
        price_escalation_note: data.price_escalation_note,
        proposal_markup_pct: useTargetMargin ? null : data.proposal_markup_pct,
        target_margin_pct: useTargetMargin ? data.target_margin_pct : null,
        total_cost: totalCost,
        effective_cost: effectiveCost,
        proposal_sale_price: proposalSalePrice,
        margin_pct: marginPct,
        materials_total: categoryTotals.Materials,
        labor_total: categoryTotals.Labor,
        equipment_total: categoryTotals.Equipment,
        miscellanea_total: categoryTotals.Miscellanea,
        subcontractor_total: categoryTotals.Subcontractor,
        status: 'Draft',
        notes: data.notes,
        is_active: true,
      });

      // Create estimate lines
      for (const line of estimateLines) {
        await base44.entities.EstimateLine.create({
          ...line,
          estimate_id: estimate.id,
        });
      }

      return estimate;
    },
    onSuccess: (estimate) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      navigate(createPageUrl(`EstimateDetail?id=${estimate.id}`));
    },
    onError: (err) => {
      setError(err.message || 'Failed to create estimate');
    },
  });

  const handleSubmit = () => {
    setError('');
    
    // Validation
    if (!formData.template_id) {
      setError('Please select a template');
      return;
    }
    if (!formData.vendor_id) {
      setError('Please select a vendor');
      return;
    }
    if (!formData.design_mode) {
      setError('Please select a design mode');
      return;
    }
    if (!formData.head_count || formData.head_count < 1) {
      setError('Please enter a valid head count');
      return;
    }
    if (!formData.riser_count || formData.riser_count < 1) {
      setError('Please enter a valid riser count');
      return;
    }

    createEstimateMutation.mutate(formData);
  };

  const isLoading = loadingTemplates || loadingVendors;

  return (
    <div>
      <PageHeader 
        title="New Estimate"
        subtitle="Create a new NFPA 13D sprinkler estimate"
        icon={FilePlus}
        backTo="Dashboard"
        backLabel="Back to Dashboard"
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" />
            <p className="text-slate-500 mt-2">Loading...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <EstimateForm
            formData={formData}
            setFormData={setFormData}
            templates={templates}
            vendors={vendors}
            useTargetMargin={useTargetMargin}
            setUseTargetMargin={setUseTargetMargin}
          />

          <div className="flex justify-end gap-3 mt-6 pb-8">
            <Button 
              variant="outline"
              onClick={() => navigate(createPageUrl('Dashboard'))}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleSubmit}
              disabled={createEstimateMutation.isPending}
            >
              {createEstimateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Estimate'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}