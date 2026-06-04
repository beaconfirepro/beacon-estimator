import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  FileText, 
  Download, 
  Copy, 
  Loader2,
  Calendar,
  Building2,
  Layers,
  Settings2
} from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';
import EstimateSummary from '../components/estimates/EstimateSummary';
import EstimateLinesTable from '../components/estimates/EstimateLinesTable';

export default function EstimateDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');
  
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const { data: estimate, isLoading: loadingEstimate } = useQuery({
    queryKey: ['estimate', estimateId],
    queryFn: () => base44.entities.Estimate.filter({ id: estimateId }).then(r => r[0]),
    enabled: !!estimateId,
  });

  const { data: estimateLines = [], isLoading: loadingLines } = useQuery({
    queryKey: ['estimateLines', estimateId],
    queryFn: () => base44.entities.EstimateLine.filter({ estimate_id: estimateId }),
    enabled: !!estimateId,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.Template.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const vendorMap = vendors.reduce((acc, v) => ({ ...acc, [v.id]: v }), {});
  const templateMap = templates.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      await base44.entities.Estimate.update(estimateId, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', estimateId] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const newEstimateNumber = `EST-${timestamp}`;
      
      const newEstimate = await base44.entities.Estimate.create({
        ...estimate,
        id: undefined,
        estimate_number: newEstimateNumber,
        name: `${estimate.name || estimate.estimate_number} (Copy)`,
        status: 'Draft',
        created_date: undefined,
        updated_date: undefined,
      });

      for (const line of estimateLines) {
        await base44.entities.EstimateLine.create({
          ...line,
          id: undefined,
          estimate_id: newEstimate.id,
          created_date: undefined,
          updated_date: undefined,
        });
      }

      return newEstimate;
    },
    onSuccess: (newEstimate) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      navigate(createPageUrl(`EstimateDetail?id=${newEstimate.id}`));
    },
  });

  const exportCSV = () => {
    const headers = ['Item', 'Category', 'Qty', 'Unit Cost', 'Ext Cost', 'Markup %', 'Unit Price', 'Ext Price'];
    const rows = estimateLines.map(line => {
      const product = products.find(p => p.id === line.product_id);
      return [
        line.display_name || product?.name,
        line.cost_category,
        line.quantity?.toFixed(2),
        line.unit_cost?.toFixed(2),
        line.extended_cost?.toFixed(2),
        line.item_markup_pct_applied?.toFixed(1),
        line.line_unit_sale_price?.toFixed(2),
        line.extended_sale_price?.toFixed(2),
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${estimate?.estimate_number || 'estimate'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryTotals = {
    Materials: estimate?.materials_total || 0,
    Labor: estimate?.labor_total || 0,
    Equipment: estimate?.equipment_total || 0,
    Miscellanea: estimate?.miscellanea_total || 0,
    Subcontractor: estimate?.subcontractor_total || 0,
  };

  const isLoading = loadingEstimate || loadingLines;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!estimate) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Estimate not found</h3>
        </CardContent>
      </Card>
    );
  }

  const vendor = vendorMap[estimate.vendor_id];
  const template = templateMap[estimate.template_id];

  return (
    <div>
      <PageHeader 
        title={estimate.name || estimate.estimate_number}
        subtitle={`Estimate ${estimate.estimate_number}`}
        icon={FileText}
        backTo="Estimates"
        backLabel="Back to Estimates"
        actions={
          <div className="flex items-center gap-2">
            <Select 
              value={estimate.status} 
              onValueChange={(value) => updateStatusMutation.mutate(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Won">Won</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(true)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </Button>
          </div>
        }
      />

      {/* Estimate Info Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Vendor</p>
                <p className="font-medium text-slate-900">{vendor?.name || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Template</p>
                <p className="font-medium text-slate-900">{template?.name || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Design Mode</p>
                <p className="font-medium text-slate-900">{estimate.design_mode}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Heads</p>
              <p className="text-2xl font-bold text-slate-900">{estimate.head_count}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Risers</p>
              <p className="text-2xl font-bold text-slate-900">{estimate.riser_count}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Created</p>
                <p className="font-medium text-slate-900">
                  {format(new Date(estimate.created_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="mb-6">
        <EstimateSummary estimate={estimate} categoryTotals={categoryTotals} />
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Line Items</span>
            <Badge variant="outline">{estimateLines.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EstimateLinesTable lines={estimateLines} products={products} />
        </CardContent>
      </Card>

      {/* Notes */}
      {estimate.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 whitespace-pre-wrap">{estimate.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a copy of this estimate with all line items. The new estimate will be set to Draft status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => duplicateMutation.mutate()}
              disabled={duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Duplicate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}