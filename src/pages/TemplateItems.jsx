import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Layers, 
  Plus, 
  Pencil, 
  Trash2,
  Loader2,
  Filter
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

const categoryColors = {
  Materials: 'bg-blue-100 text-blue-700',
  Labor: 'bg-green-100 text-green-700',
  Equipment: 'bg-purple-100 text-purple-700',
  Miscellanea: 'bg-amber-100 text-amber-700',
  Subcontractor: 'bg-red-100 text-red-700',
};

export default function TemplateItems() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const templateId = urlParams.get('templateId');

  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItemForRules, setSelectedItemForRules] = useState(null);

  const { data: template } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => base44.entities.Template.filter({ id: templateId }).then(r => r[0]),
    enabled: !!templateId,
  });

  const { data: templateItems = [], isLoading } = useQuery({
    queryKey: ['templateItems', templateId],
    queryFn: () => base44.entities.TemplateItem.filter({ template_id: templateId }),
    enabled: !!templateId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_active: true }),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.filter({ is_active: true }),
  });

  const { data: itemRules = [] } = useQuery({
    queryKey: ['itemRules', selectedItemForRules?.id],
    queryFn: () => base44.entities.TemplateItemRule.filter({ 
      template_item_id: selectedItemForRules.id 
    }),
    enabled: !!selectedItemForRules,
  });

  const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

  const itemMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        await base44.entities.TemplateItem.update(editingItem.id, data);
      } else {
        await base44.entities.TemplateItem.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templateItems', templateId] });
      setShowItemDialog(false);
      setEditingItem(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.TemplateItem.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templateItems', templateId] });
    },
  });

  const ruleMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.TemplateItemRule.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemRules', selectedItemForRules?.id] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.TemplateItemRule.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemRules', selectedItemForRules?.id] });
    },
  });

  const handleSaveItem = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      template_id: templateId,
      display_name: formData.get('display_name'),
      product_id: formData.get('product_id'),
      basis: formData.get('basis'),
      base_factor: formData.get('basis') !== 'PerProject' ? parseFloat(formData.get('base_factor')) || 1 : null,
      fixed_project_qty: formData.get('basis') === 'PerProject' ? parseFloat(formData.get('fixed_project_qty')) || 1 : null,
      round_rule: formData.get('round_rule'),
      cost_category: formData.get('cost_category'),
      markup_pct_override: formData.get('markup_pct_override') ? parseFloat(formData.get('markup_pct_override')) : null,
      sort_order: parseInt(formData.get('sort_order')) || 0,
      is_active: true,
    };
    itemMutation.mutate(data);
  };

  const handleAddRule = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      template_item_id: selectedItemForRules.id,
      rule_type: formData.get('rule_type'),
      condition_type: formData.get('condition_type'),
      condition_value: formData.get('condition_value'),
      is_active: true,
    };
    ruleMutation.mutate(data);
    e.target.reset();
  };

  const sortedItems = [...templateItems].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div>
      <PageHeader 
        title={template?.name || 'Template Items'}
        subtitle="Manage template line items and inclusion rules"
        icon={Layers}
        backTo="Templates"
        backLabel="Back to Templates"
        actions={
          <Button 
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => {
              setEditingItem(null);
              setShowItemDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead className="text-right">Factor/Qty</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Markup Override</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                    No items in this template. Click "Add Item" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{item.display_name}</TableCell>
                    <TableCell className="text-sm">
                      {productMap[item.product_id]?.name || '-'}
                      <div className="text-xs text-slate-400">{productMap[item.product_id]?.sku}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.basis}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.basis === 'PerProject' 
                        ? item.fixed_project_qty 
                        : item.base_factor}
                    </TableCell>
                    <TableCell>{item.round_rule}</TableCell>
                    <TableCell>
                      <Badge className={categoryColors[item.cost_category]}>
                        {item.cost_category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.markup_pct_override != null ? `${item.markup_pct_override}%` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.is_active ? (
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                      ) : (
                        <span className="w-2 h-2 bg-slate-300 rounded-full inline-block" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedItemForRules(item);
                            setShowRulesDialog(true);
                          }}
                        >
                          <Filter className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingItem(item);
                            setShowItemDialog(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveItem}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name *</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  defaultValue={editingItem?.display_name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_id">Product *</Label>
                <Select name="product_id" defaultValue={editingItem?.product_id} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basis">Basis *</Label>
                  <Select name="basis" defaultValue={editingItem?.basis || 'PerHead'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PerHead">Per Head</SelectItem>
                      <SelectItem value="PerRiser">Per Riser</SelectItem>
                      <SelectItem value="PerProject">Per Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_factor">Factor / Fixed Qty</Label>
                  <Input
                    id="base_factor"
                    name="base_factor"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.base_factor || editingItem?.fixed_project_qty || 1}
                  />
                  <input type="hidden" name="fixed_project_qty" value="" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="round_rule">Rounding</Label>
                  <Select name="round_rule" defaultValue={editingItem?.round_rule || 'None'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Ceiling">Ceiling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_category">Category *</Label>
                  <Select name="cost_category" defaultValue={editingItem?.cost_category || 'Materials'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Materials">Materials</SelectItem>
                      <SelectItem value="Labor">Labor</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Miscellanea">Miscellanea</SelectItem>
                      <SelectItem value="Subcontractor">Subcontractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="markup_pct_override">Markup Override %</Label>
                  <Input
                    id="markup_pct_override"
                    name="markup_pct_override"
                    type="number"
                    step="0.01"
                    defaultValue={editingItem?.markup_pct_override}
                    placeholder="Leave blank for template default"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    name="sort_order"
                    type="number"
                    defaultValue={editingItem?.sort_order || 0}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={itemMutation.isPending}>
                {itemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rules Dialog */}
      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Inclusion Rules: {selectedItemForRules?.display_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-slate-500">
              <strong>Exclude</strong> rules take priority. If <strong>Include</strong> rules exist, at least one must match for the item to be included.
            </div>

            {/* Existing Rules */}
            {itemRules.length > 0 && (
              <div className="space-y-2">
                {itemRules.map(rule => (
                  <div 
                    key={rule.id} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      rule.rule_type === 'Exclude' ? 'bg-red-50' : 'bg-green-50'
                    }`}
                  >
                    <div>
                      <Badge className={rule.rule_type === 'Exclude' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                        {rule.rule_type}
                      </Badge>
                      <span className="ml-2 text-sm">
                        {rule.condition_type}: {
                          rule.condition_type === 'Vendor' 
                            ? vendors.find(v => v.id === rule.condition_value)?.name 
                            : rule.condition_value
                        }
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Rule Form */}
            <form onSubmit={handleAddRule} className="border-t pt-4">
              <div className="grid grid-cols-3 gap-3">
                <Select name="rule_type" defaultValue="Include">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Include">Include</SelectItem>
                    <SelectItem value="Exclude">Exclude</SelectItem>
                  </SelectContent>
                </Select>

                <Select name="condition_type" defaultValue="Vendor">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                    <SelectItem value="DesignMode">Design Mode</SelectItem>
                  </SelectContent>
                </Select>

                <Select name="condition_value" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Value" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Mixed-Use">Mixed-Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="mt-3 w-full" variant="outline" disabled={ruleMutation.isPending}>
                {ruleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Rule'}
              </Button>
            </form>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowRulesDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}