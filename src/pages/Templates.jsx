import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Search,
  Loader2,
  ChevronRight
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

export default function Templates() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.Template.list('-created_date'),
  });

  const { data: templateItems = [] } = useQuery({
    queryKey: ['templateItems', selectedTemplate?.id],
    queryFn: () => base44.entities.TemplateItem.filter({ template_id: selectedTemplate.id }),
    enabled: !!selectedTemplate,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

  const filteredTemplates = templates.filter(t => 
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const templateMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTemplate) {
        await base44.entities.Template.update(editingTemplate.id, data);
      } else {
        await base44.entities.Template.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setShowTemplateDialog(false);
      setEditingTemplate(null);
    },
  });

  const handleSaveTemplate = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      system_type: formData.get('system_type'),
      default_markup_pct: parseFloat(formData.get('default_markup_pct')) || 25,
      version: formData.get('version'),
      is_active: true,
    };
    templateMutation.mutate(data);
  };

  return (
    <div>
      <PageHeader 
        title="Templates"
        subtitle="Manage estimate templates and line items"
        icon={Layers}
        actions={
          <Button 
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => {
              setEditingTemplate(null);
              setShowTemplateDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No templates found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTemplates.map(template => (
                    <div
                      key={template.id}
                      className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedTemplate?.id === template.id ? 'bg-orange-50 border-l-2 border-orange-500' : ''
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-900">{template.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {template.system_type}
                            </Badge>
                            {!template.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Template Detail */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTemplate.name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">{selectedTemplate.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTemplate(selectedTemplate);
                      setShowTemplateDialog(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-slate-500">System:</span>{' '}
                    <span className="font-medium">{selectedTemplate.system_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Default Markup:</span>{' '}
                    <span className="font-medium">{selectedTemplate.default_markup_pct}%</span>
                  </div>
                  {selectedTemplate.version && (
                    <div>
                      <span className="text-slate-500">Version:</span>{' '}
                      <span className="font-medium">{selectedTemplate.version}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Template Items</h3>
                  <Link to={createPageUrl(`TemplateItems?templateId=${selectedTemplate.id}`)}>
                    <Button variant="outline" size="sm">
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Items
                    </Button>
                  </Link>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Item</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Basis</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templateItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                            No items in this template
                          </TableCell>
                        </TableRow>
                      ) : (
                        templateItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.display_name}</TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {productMap[item.product_id]?.name || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.basis}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{item.cost_category}</TableCell>
                            <TableCell className="text-center">
                              {item.is_active ? (
                                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                              ) : (
                                <span className="w-2 h-2 bg-slate-300 rounded-full inline-block" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Select a template</h3>
                <p className="text-slate-500">Choose a template from the list to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTemplate?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingTemplate?.description}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="system_type">System Type</Label>
                  <Select name="system_type" defaultValue={editingTemplate?.system_type || 'NFPA 13D'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NFPA 13D">NFPA 13D</SelectItem>
                      <SelectItem value="NFPA 13R">NFPA 13R</SelectItem>
                      <SelectItem value="NFPA 13">NFPA 13</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_markup_pct">Default Markup %</Label>
                  <Input
                    id="default_markup_pct"
                    name="default_markup_pct"
                    type="number"
                    step="0.01"
                    defaultValue={editingTemplate?.default_markup_pct || 25}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  name="version"
                  defaultValue={editingTemplate?.version}
                  placeholder="e.g., 1.0"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={templateMutation.isPending}>
                {templateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}