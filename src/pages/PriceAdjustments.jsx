import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Package, 
  Plus, 
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';

export default function PriceAdjustments() {
  const queryClient = useQueryClient();
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [percentChange, setPercentChange] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.filter({ is_active: true }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_active: true }),
  });

  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ['priceBatches'],
    queryFn: () => base44.entities.PriceAdjustmentBatch.list('-created_date', 50),
  });

  const { data: vendorCosts = [] } = useQuery({
    queryKey: ['vendorCostsForBatch', selectedVendor],
    queryFn: () => base44.entities.VendorUnitCostHistory.filter({ 
      vendor_id: selectedVendor,
      is_current: true 
    }),
    enabled: !!selectedVendor,
  });

  const vendorMap = vendors.reduce((acc, v) => ({ ...acc, [v.id]: v }), {});
  const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

  // Build map of current costs
  const currentCostMap = {};
  vendorCosts.forEach(vc => {
    currentCostMap[vc.product_id] = vc;
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  // Products that have current vendor pricing
  const eligibleProducts = products.filter(p => currentCostMap[p.id]);
  const filteredProducts = eligibleProducts.filter(p => 
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const toggleProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const generatePreview = () => {
    const pct = parseFloat(percentChange) / 100;
    const preview = selectedProducts.map(productId => {
      const currentCost = currentCostMap[productId];
      const product = productMap[productId];
      const oldCost = currentCost?.unit_cost || 0;
      const newCost = oldCost * (1 + pct);
      return {
        productId,
        productName: product?.name,
        sku: product?.sku,
        oldCost,
        newCost: Math.round(newCost * 100) / 100,
        change: newCost - oldCost,
      };
    });
    setPreviewData(preview);
    setShowConfirmDialog(true);
  };

  const applyBatchMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      
      // Create batch record
      const batch = await base44.entities.PriceAdjustmentBatch.create({
        vendor_id: selectedVendor,
        percent_change: parseFloat(percentChange),
        reason_note: reasonNote,
        products_affected: previewData.length,
        status: 'Applied',
        applied_at: now,
        is_active: true,
      });

      // Create batch items and new cost records
      for (const item of previewData) {
        // Create batch item
        await base44.entities.PriceAdjustmentBatchItem.create({
          batch_id: batch.id,
          vendor_id: selectedVendor,
          product_id: item.productId,
          old_unit_cost: item.oldCost,
          new_unit_cost: item.newCost,
          applied_at: now,
          is_active: true,
        });

        // Set old cost to not current
        const oldCostRecord = currentCostMap[item.productId];
        if (oldCostRecord) {
          await base44.entities.VendorUnitCostHistory.update(oldCostRecord.id, { 
            is_current: false 
          });
        }

        // Create new current cost
        await base44.entities.VendorUnitCostHistory.create({
          vendor_id: selectedVendor,
          product_id: item.productId,
          unit_cost: item.newCost,
          pricing_as_at_date: now.split('T')[0],
          source_note: `Bulk adjustment: ${percentChange}% - ${reasonNote}`,
          is_current: true,
          is_active: true,
        });
      }

      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceBatches'] });
      queryClient.invalidateQueries({ queryKey: ['vendorCosts'] });
      setShowConfirmDialog(false);
      setShowNewBatch(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setSelectedVendor('');
    setPercentChange('');
    setReasonNote('');
    setSelectedProducts([]);
    setProductSearch('');
    setPreviewData([]);
  };

  const statusColors = {
    Pending: 'bg-amber-100 text-amber-700',
    Applied: 'bg-green-100 text-green-700',
    Cancelled: 'bg-slate-100 text-slate-700',
  };

  return (
    <div>
      <PageHeader 
        title="Bulk Price Adjustments"
        subtitle="Apply percentage-based price changes across multiple products"
        icon={Package}
        actions={
          <Button 
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => setShowNewBatch(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Adjustment
          </Button>
        }
      />

      {/* Batch History */}
      <Card>
        <CardHeader>
          <CardTitle>Adjustment History</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Change %</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingBatches ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No adjustment batches yet
                  </TableCell>
                </TableRow>
              ) : (
                batches.map(batch => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {format(new Date(batch.created_date), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {vendorMap[batch.vendor_id]?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {batch.percent_change > 0 ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-green-500" />
                        )}
                        <span className={batch.percent_change > 0 ? 'text-red-600' : 'text-green-600'}>
                          {batch.percent_change > 0 ? '+' : ''}{batch.percent_change}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{batch.products_affected}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{batch.reason_note}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[batch.status]}>{batch.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{batch.created_by}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* New Batch Dialog */}
      <Dialog open={showNewBatch} onOpenChange={setShowNewBatch}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Bulk Price Adjustment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Config */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select value={selectedVendor} onValueChange={(v) => {
                  setSelectedVendor(v);
                  setSelectedProducts([]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Percent Change *</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={percentChange}
                    onChange={(e) => setPercentChange(e.target.value)}
                    placeholder="e.g., 5 or -3"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <Input
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  placeholder="e.g., Annual price increase"
                />
              </div>
            </div>

            {/* Product Selection */}
            {selectedVendor && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Products ({selectedProducts.length} selected)</Label>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {eligibleProducts.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 border rounded-lg">
                    No products with current pricing for this vendor
                  </div>
                ) : (
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Current Cost</TableHead>
                          {percentChange && (
                            <TableHead className="text-right">New Cost</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map(product => {
                          const currentCost = currentCostMap[product.id]?.unit_cost || 0;
                          const pct = parseFloat(percentChange) / 100 || 0;
                          const newCost = currentCost * (1 + pct);
                          
                          return (
                            <TableRow key={product.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedProducts.includes(product.id)}
                                  onCheckedChange={() => toggleProduct(product.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-sm text-slate-500">{product.sku}</TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(currentCost)}
                              </TableCell>
                              {percentChange && (
                                <TableCell className="text-right font-mono">
                                  <span className={parseFloat(percentChange) > 0 ? 'text-red-600' : 'text-green-600'}>
                                    {formatCurrency(newCost)}
                                  </span>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => {
              setShowNewBatch(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={generatePreview}
              disabled={!selectedVendor || !percentChange || !reasonNote || selectedProducts.length === 0}
            >
              Preview & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Price Adjustment
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to apply a <strong>{percentChange}%</strong> price change to <strong>{previewData.length} products</strong> from <strong>{vendorMap[selectedVendor]?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="border rounded-lg max-h-[200px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Old</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map(item => (
                  <TableRow key={item.productId}>
                    <TableCell className="text-sm">{item.productName}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(item.oldCost)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(item.newCost)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${item.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.change > 0 ? '+' : ''}{formatCurrency(item.change)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => applyBatchMutation.mutate()}
              disabled={applyBatchMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {applyBatchMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Apply Changes'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}