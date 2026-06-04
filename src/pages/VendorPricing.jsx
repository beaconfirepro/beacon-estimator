import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DollarSign, 
  Plus, 
  Search,
  Loader2,
  Building2,
  Package,
  History,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';

export default function VendorPricing() {
  const queryClient = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [showPriceDialog, setShowPriceDialog] = useState(false);

  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.filter({ is_active: true }),
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_active: true }),
  });

  const { data: vendorCosts = [], isLoading: loadingCosts } = useQuery({
    queryKey: ['vendorCosts', selectedVendor?.id],
    queryFn: () => base44.entities.VendorUnitCostHistory.filter({ vendor_id: selectedVendor.id }),
    enabled: !!selectedVendor,
  });

  const { data: productHistory = [] } = useQuery({
    queryKey: ['productHistory', selectedVendor?.id, selectedProduct?.id],
    queryFn: () => base44.entities.VendorUnitCostHistory.filter({ 
      vendor_id: selectedVendor.id,
      product_id: selectedProduct.id 
    }),
    enabled: !!selectedVendor && !!selectedProduct,
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  // Build current cost map for selected vendor
  const currentCostMap = {};
  vendorCosts.filter(vc => vc.is_current).forEach(vc => {
    currentCostMap[vc.product_id] = vc;
  });

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addPriceMutation = useMutation({
    mutationFn: async (data) => {
      // First, set all existing current costs to not current
      const existingCurrent = vendorCosts.filter(
        vc => vc.vendor_id === selectedVendor.id && 
             vc.product_id === selectedProduct.id && 
             vc.is_current
      );
      
      for (const vc of existingCurrent) {
        await base44.entities.VendorUnitCostHistory.update(vc.id, { is_current: false });
      }

      // Create new current cost
      await base44.entities.VendorUnitCostHistory.create({
        vendor_id: selectedVendor.id,
        product_id: selectedProduct.id,
        unit_cost: data.unit_cost,
        pricing_as_at_date: data.pricing_as_at_date,
        source_note: data.source_note,
        is_current: true,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorCosts', selectedVendor?.id] });
      queryClient.invalidateQueries({ queryKey: ['productHistory'] });
      setShowPriceDialog(false);
    },
  });

  const handleAddPrice = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    addPriceMutation.mutate({
      unit_cost: parseFloat(formData.get('unit_cost')),
      pricing_as_at_date: formData.get('pricing_as_at_date'),
      source_note: formData.get('source_note'),
    });
  };

  return (
    <div>
      <PageHeader 
        title="Vendor Pricing"
        subtitle="Manage vendor-specific product pricing"
        icon={DollarSign}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Vendors List */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Vendors
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingVendors ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </div>
              ) : (
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {vendors.map(vendor => (
                    <div
                      key={vendor.id}
                      className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedVendor?.id === vendor.id ? 'bg-orange-50 border-l-2 border-orange-500' : ''
                      }`}
                      onClick={() => {
                        setSelectedVendor(vendor);
                        setSelectedProduct(null);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{vendor.name}</p>
                          <p className="text-xs text-slate-500">{vendor.code}</p>
                        </div>
                        {vendor.alternate_pricing_enabled && (
                          <Badge variant="outline" className="text-xs">Alt</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Products List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Products
                </CardTitle>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedVendor ? (
                <div className="p-8 text-center text-slate-500">
                  Select a vendor to view pricing
                </div>
              ) : loadingProducts || loadingCosts ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Default Cost</TableHead>
                        <TableHead className="text-right">Vendor Cost</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map(product => {
                        const currentCost = currentCostMap[product.id];
                        return (
                          <TableRow 
                            key={product.id}
                            className={`cursor-pointer hover:bg-slate-50 ${
                              selectedProduct?.id === product.id ? 'bg-orange-50' : ''
                            }`}
                            onClick={() => setSelectedProduct(product)}
                          >
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-sm text-slate-500">{product.sku}</TableCell>
                            <TableCell className="text-right font-mono text-slate-500">
                              {formatCurrency(product.default_unit_cost)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {currentCost ? (
                                <span className="font-medium text-green-600">
                                  {formatCurrency(currentCost.unit_cost)}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Price History */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Price History
                </CardTitle>
                {selectedProduct && selectedVendor && (
                  <Button size="sm" onClick={() => setShowPriceDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedProduct ? (
                <div className="text-center text-slate-500 py-8 text-sm">
                  Select a product to view history
                </div>
              ) : productHistory.length === 0 ? (
                <div className="text-center text-slate-500 py-8 text-sm">
                  No pricing history for this product
                </div>
              ) : (
                <div className="space-y-3">
                  {productHistory
                    .sort((a, b) => new Date(b.pricing_as_at_date) - new Date(a.pricing_as_at_date))
                    .map(ph => (
                      <div 
                        key={ph.id} 
                        className={`p-3 rounded-lg border ${
                          ph.is_current ? 'border-green-200 bg-green-50' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-semibold">
                            {formatCurrency(ph.unit_cost)}
                          </span>
                          {ph.is_current && (
                            <Badge className="bg-green-100 text-green-700">Current</Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {format(new Date(ph.pricing_as_at_date), 'MMM d, yyyy')}
                        </div>
                        {ph.source_note && (
                          <div className="text-xs text-slate-400 mt-1">{ph.source_note}</div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Price Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Price</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPrice}>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium">{selectedProduct?.name}</p>
                <p className="text-xs text-slate-500">{selectedVendor?.name}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_cost">Unit Cost *</Label>
                <Input
                  id="unit_cost"
                  name="unit_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricing_as_at_date">Effective Date *</Label>
                <Input
                  id="pricing_as_at_date"
                  name="pricing_as_at_date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source_note">Source Note</Label>
                <Textarea
                  id="source_note"
                  name="source_note"
                  rows={2}
                  placeholder="e.g., Quote #123, Catalog 2024"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowPriceDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addPriceMutation.isPending}>
                {addPriceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}