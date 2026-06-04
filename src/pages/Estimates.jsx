import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileText, 
  Search,
  ArrowUpDown,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';

const statusColors = {
  Draft: 'bg-slate-100 text-slate-700',
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-blue-100 text-blue-700',
  Sent: 'bg-purple-100 text-purple-700',
  Won: 'bg-green-100 text-green-700',
  Lost: 'bg-red-100 text-red-700',
};

export default function Estimates() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_date');
  const [sortDir, setSortDir] = useState('desc');

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['estimates'],
    queryFn: () => base44.entities.Estimate.list('-created_date', 100),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.Template.list(),
  });

  const vendorMap = vendors.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {});
  const templateMap = templates.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {});

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  const filteredEstimates = estimates
    .filter(e => {
      const matchesSearch = !search || 
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.estimate_number?.toLowerCase().includes(search.toLowerCase()) ||
        vendorMap[e.vendor_id]?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      }
      if (sortDir === 'desc') {
        return aVal > bVal ? -1 : 1;
      }
      return aVal > bVal ? 1 : -1;
    });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div>
      <PageHeader 
        title="Estimates"
        subtitle="Manage all your NFPA 13D sprinkler estimates"
        icon={FileText}
        actions={
          <Link to={createPageUrl('NewEstimate')}>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Estimate
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, number, or vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Won">Won</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('estimate_number')}>
                    Estimate # <ArrowUpDown className="ml-1 w-3 h-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('name')}>
                    Name <ArrowUpDown className="ml-1 w-3 h-3" />
                  </Button>
                </TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Template</TableHead>
                <TableHead className="text-center">Heads</TableHead>
                <TableHead className="text-center">Risers</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('proposal_sale_price')}>
                    Sale Price <ArrowUpDown className="ml-1 w-3 h-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('created_date')}>
                    Created <ArrowUpDown className="ml-1 w-3 h-3" />
                  </Button>
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <div className="animate-pulse">Loading estimates...</div>
                  </TableCell>
                </TableRow>
              ) : filteredEstimates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                    No estimates found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEstimates.map(estimate => (
                  <TableRow key={estimate.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm">{estimate.estimate_number}</TableCell>
                    <TableCell className="font-medium">{estimate.name || '-'}</TableCell>
                    <TableCell>{vendorMap[estimate.vendor_id] || '-'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{templateMap[estimate.template_id] || '-'}</TableCell>
                    <TableCell className="text-center">{estimate.head_count}</TableCell>
                    <TableCell className="text-center">{estimate.riser_count}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(estimate.proposal_sale_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      {(estimate.margin_pct || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[estimate.status] || statusColors.Draft}>
                        {estimate.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {format(new Date(estimate.created_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Link to={createPageUrl(`EstimateDetail?id=${estimate.id}`)}>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}