import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown } from 'lucide-react';
import { Button } from "@/components/ui/button";

const categoryColors = {
  Materials: 'bg-blue-100 text-blue-700',
  Labor: 'bg-green-100 text-green-700',
  Equipment: 'bg-purple-100 text-purple-700',
  Miscellanea: 'bg-amber-100 text-amber-700',
  Subcontractor: 'bg-red-100 text-red-700',
};

export default function EstimateLinesTable({ lines, products }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('display_name');
  const [sortDir, setSortDir] = useState('asc');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  const productMap = products.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const filteredLines = lines
    .filter(line => {
      const searchLower = search.toLowerCase();
      const product = productMap[line.product_id];
      return (
        line.display_name?.toLowerCase().includes(searchLower) ||
        product?.name?.toLowerCase().includes(searchLower) ||
        product?.sku?.toLowerCase().includes(searchLower) ||
        line.cost_category?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || '';
      }
      if (sortDir === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search line items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => toggleSort('display_name')} className="font-semibold">
                  Item <ArrowUpDown className="ml-1 w-3 h-3" />
                </Button>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('quantity')} className="font-semibold">
                  Qty <ArrowUpDown className="ml-1 w-3 h-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('extended_cost')} className="font-semibold">
                  Ext. Cost <ArrowUpDown className="ml-1 w-3 h-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Markup</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('extended_sale_price')} className="font-semibold">
                  Ext. Price <ArrowUpDown className="ml-1 w-3 h-3" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No line items found
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map((line) => {
                const product = productMap[line.product_id];
                return (
                  <TableRow key={line.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{line.display_name}</p>
                        <p className="text-xs text-slate-500">{product?.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={categoryColors[line.cost_category] || 'bg-slate-100'}>
                        {line.cost_category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.quantity?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(line.unit_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(line.extended_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-500">
                      {(line.item_markup_pct_applied || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(line.line_unit_sale_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-orange-600">
                      {formatCurrency(line.extended_sale_price)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-slate-500">
        Showing {filteredLines.length} of {lines.length} items
      </div>
    </div>
  );
}