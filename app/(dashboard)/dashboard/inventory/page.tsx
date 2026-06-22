'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Package,
  AlertTriangle,
  TrendingDown,
  Edit2,
  History,
  ShoppingCart,
  ArrowDownCircle,
} from 'lucide-react';
import { supabase, Ingredient, IngredientWithAlert, MenuItem, RecipeIngredient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<IngredientWithAlert[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<(RecipeIngredient & { ingredient: Ingredient })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');

  // Dialogs
  const [ingredientDialog, setIngredientDialog] = useState(false);
  const [recipeDialog, setRecipeDialog] = useState(false);
  const [stockDialog, setStockDialog] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('');

  // Form state
  const [ingredientName, setIngredientName] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('');
  const [ingredientStock, setIngredientStock] = useState('');
  const [ingredientMinStock, setIngredientMinStock] = useState('');
  const [ingredientCost, setIngredientCost] = useState('');
  const [ingredientSupplier, setIngredientSupplier] = useState('');

  const [recipeIngredientId, setRecipeIngredientId] = useState('');
  const [recipeQuantity, setRecipeQuantity] = useState('');

  const [stockAdjustment, setStockAdjustment] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [stockAdjustmentType, setStockAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustingIngredient, setAdjustingIngredient] = useState<Ingredient | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [{ data: ingredientsData }, { data: menuItemsData }, { data: recipesData }] = await Promise.all([
        supabase.from('ingredients').select('*').order('name'),
        supabase.from('menu_items').select('*').order('name'),
        supabase.from('recipe_ingredients').select('*, ingredient:ingredients(*)'),
      ]);

      const processedIngredients = (ingredientsData || []).map((i) => ({
        ...i,
        stock_percentage:
          i.min_stock_threshold > 0
            ? (i.current_stock / i.min_stock_threshold) * 100
            : 100,
        is_low_stock:
          i.min_stock_threshold > 0 && i.current_stock < i.min_stock_threshold * 0.3,
      }));

      setIngredients(processedIngredients as IngredientWithAlert[]);
      setMenuItems(menuItemsData || []);
      setRecipes(recipesData as (RecipeIngredient & { ingredient: Ingredient })[]);
    } catch (error) {
      console.error('Hiba a készlet betöltésekor:', error);
      toast.error('Nem sikerült betölteni a készletadatokat');
    } finally {
      setLoading(false);
    }
  }

  async function saveIngredient() {
    if (!ingredientName.trim() || !ingredientUnit.trim()) {
      toast.error('A név és mértékegység kötelező');
      return;
    }

    setSaving(true);
    try {
      if (editingIngredient) {
        const { error } = await supabase
          .from('ingredients')
          .update({
            name: ingredientName,
            unit: ingredientUnit,
            current_stock: parseFloat(ingredientStock) || 0,
            min_stock_threshold: parseFloat(ingredientMinStock) || 10,
            cost_per_unit: parseFloat(ingredientCost) || null,
            supplier: ingredientSupplier || null,
          })
          .eq('id', editingIngredient.id);
        if (error) throw error;
        toast.success('Alapanyag frissítve');
      } else {
        const { error } = await supabase.from('ingredients').insert({
          name: ingredientName,
          unit: ingredientUnit,
          current_stock: parseFloat(ingredientStock) || 0,
          min_stock_threshold: parseFloat(ingredientMinStock) || 10,
          cost_per_unit: parseFloat(ingredientCost) || null,
          supplier: ingredientSupplier || null,
        });
        if (error) throw error;
        toast.success('Alapanyag létrehozva');
      }
      closeIngredientDialog();
      loadData();
    } catch (error) {
      console.error('Hiba az alapanyag mentésekor:', error);
      toast.error('Nem sikerült menteni az alapanyagot');
    } finally {
      setSaving(false);
    }
  }

  async function saveRecipeIngredient() {
    if (!selectedMenuItem || !recipeIngredientId || !recipeQuantity) {
      toast.error('Minden mező kötelező');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('recipe_ingredients').insert({
        menu_item_id: selectedMenuItem,
        ingredient_id: recipeIngredientId,
        quantity: parseFloat(recipeQuantity),
      });
      if (error) throw error;
      toast.success('Alapanyag hozzáadva a recepthez');
      closeRecipeDialog();
      loadData();
    } catch (error) {
      console.error('Hiba a recept mentésekor:', error);
      toast.error('Nem sikerült hozzáadni az alapanyagot');
    } finally {
      setSaving(false);
    }
  }

  async function adjustStock() {
    if (!adjustingIngredient || !stockAdjustment) {
      toast.error('A mennyiség megadása kötelező');
      return;
    }

    const amount = parseFloat(stockAdjustment);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Érvénytelen mennyiség');
      return;
    }

    setSaving(true);
    try {
      const newStock =
        stockAdjustmentType === 'add'
          ? adjustingIngredient.current_stock + amount
          : adjustingIngredient.current_stock - amount;

      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ current_stock: Math.max(0, newStock) })
        .eq('id', adjustingIngredient.id);

      if (updateError) throw updateError;

      // Log transaction
      await supabase.from('inventory_transactions').insert({
        ingredient_id: adjustingIngredient.id,
        quantity: stockAdjustmentType === 'add' ? amount : -amount,
        transaction_type: stockAdjustmentType === 'add' ? 'purchase' : 'adjustment',
        notes: stockNote || null,
      });

      toast.success('Készlet frissítve');
      closeStockDialog();
      loadData();
    } catch (error) {
      console.error('Hiba a készlet módosításakor:', error);
      toast.error('Nem sikerült módosítani a készletet');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecipeIngredient(recipeId: string) {
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', recipeId);
      if (error) throw error;
      toast.success('Alapanyag eltávolítva a receptből');
      loadData();
    } catch (error) {
      console.error('Hiba a törléskor:', error);
      toast.error('Nem sikerült eltávolítani az alapanyagot');
    }
  }

  function openIngredientDialog(ingredient?: Ingredient) {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setIngredientName(ingredient.name);
      setIngredientUnit(ingredient.unit);
      setIngredientStock(ingredient.current_stock.toString());
      setIngredientMinStock(ingredient.min_stock_threshold.toString());
      setIngredientCost(ingredient.cost_per_unit?.toString() || '');
      setIngredientSupplier(ingredient.supplier || '');
    } else {
      setEditingIngredient(null);
      setIngredientName('');
      setIngredientUnit('');
      setIngredientStock('');
      setIngredientMinStock('10');
      setIngredientCost('');
      setIngredientSupplier('');
    }
    setIngredientDialog(true);
  }

  function openStockDialog(ingredient: Ingredient, type: 'add' | 'subtract') {
    setAdjustingIngredient(ingredient);
    setStockAdjustmentType(type);
    setStockAdjustment('');
    setStockNote('');
    setStockDialog(true);
  }

  function closeIngredientDialog() {
    setIngredientDialog(false);
    setEditingIngredient(null);
  }

  function closeRecipeDialog() {
    setRecipeDialog(false);
    setSelectedMenuItem('');
    setRecipeIngredientId('');
    setRecipeQuantity('');
  }

  function closeStockDialog() {
    setStockDialog(false);
    setAdjustingIngredient(null);
  }

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = ingredients.filter((i) => i.is_low_stock).length;

  // Group recipes by menu item
  const recipesByItem = recipes.reduce((acc, r) => {
    if (!acc[r.menu_item_id]) acc[r.menu_item_id] = [];
    acc[r.menu_item_id].push(r);
    return acc;
  }, {} as Record<string, typeof recipes>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Készletkezelés</h1>
          <p className="text-muted-foreground">Nyomon követheted az alapanyagokat és kezelheted a recepteket</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRecipeDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Recept Hozzáadása
          </Button>
          <Button onClick={() => openIngredientDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Alapanyag Hozzáadása
          </Button>
        </div>
      </div>

      {/* Statisztika */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Összes Tétel</span>
            </div>
            <div className="text-2xl font-bold mt-1">{ingredients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm text-muted-foreground">Alacsony Készlet</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-warning">{lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <span className="text-sm text-muted-foreground">Kritikus</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-destructive">
              {ingredients.filter((i) => i.stock_percentage < 10).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Receptek</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {Object.keys(recipesByItem).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">Készlet</TabsTrigger>
          <TabsTrigger value="recipes">Receptek</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Keresés */}
          <div className="max-w-md">
            <Input
              placeholder="Alapanyag keresése..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Készlet rács */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredIngredients.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nem található alapanyag</p>
                  <Button variant="link" onClick={() => openIngredientDialog()}>
                    Add hozzá az első alapanyagot
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredIngredients.map((ingredient) => (
                <Card
                  key={ingredient.id}
                  className={ingredient.is_low_stock ? 'border-warning' : ''}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{ingredient.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {ingredient.current_stock} / {ingredient.min_stock_threshold}{' '}
                          {ingredient.unit}
                        </p>
                      </div>
                      <Badge
                        variant={
                          ingredient.stock_percentage < 10
                            ? 'destructive'
                            : ingredient.stock_percentage < 30
                            ? 'secondary'
                            : 'default'
                        }
                      >
                        {ingredient.stock_percentage.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-full transition-all ${
                          ingredient.stock_percentage < 10
                            ? 'bg-destructive'
                            : ingredient.stock_percentage < 30
                            ? 'bg-warning'
                            : 'bg-success'
                        }`}
                        style={{ width: `${Math.min(ingredient.stock_percentage, 100)}%` }}
                      />
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStockDialog(ingredient, 'add')}
                        >
                          <ArrowDownCircle className="h-4 w-4 mr-1" />
                          Hozzáadás
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStockDialog(ingredient, 'subtract')}
                        >
                          Csökkentés
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openIngredientDialog(ingredient)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recept Beállítások</CardTitle>
              <CardDescription>
                Állítsd be az egyes menütételek alapanyagait az automatikus készletkövetéshez
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {menuItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nincsenek menütételek. Először adj hozzá menütételeket.</p>
                    </div>
                  ) : (
                    menuItems.map((item) => {
                      const itemRecipes = recipesByItem[item.id] || [];
                      return (
                        <Card key={item.id} className="bg-muted/30">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{item.name}</CardTitle>
                              <Badge variant="outline">{itemRecipes.length} alapanyag</Badge>
                            </div>
                            <CardDescription>
                              {Number(item.price).toLocaleString('hu-HU')} Ft
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {itemRecipes.length === 0 ? (
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Nincs recept beállítva - a készlet nem lesz követve
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {itemRecipes.map((r) => (
                                  <div
                                    key={r.id}
                                    className="flex items-center justify-between text-sm p-2 bg-background rounded"
                                  >
                                    <span>
                                      {r.ingredient?.name}: {r.quantity} {r.ingredient?.unit}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteRecipeIngredient(r.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alapanyag párbeszédablak */}
      <Dialog open={ingredientDialog} onOpenChange={setIngredientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIngredient ? 'Alapanyag Szerkesztése' : 'Új Alapanyag'}
            </DialogTitle>
            <DialogDescription>Alapanyag hozzáadása vagy módosítása</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Név</Label>
              <Input
                value={ingredientName}
                onChange={(e) => setIngredientName(e.target.value)}
                placeholder="pl.: Marhahús pogácsa, Paradicsom, Sajt"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mértékegység</Label>
                <Input
                  value={ingredientUnit}
                  onChange={(e) => setIngredientUnit(e.target.value)}
                  placeholder="kg, db, L"
                />
              </div>
              <div className="space-y-2">
                <Label>Jelenlegi Készlet</Label>
                <Input
                  type="number"
                  value={ingredientStock}
                  onChange={(e) => setIngredientStock(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimális Készlet</Label>
                <Input
                  type="number"
                  value={ingredientMinStock}
                  onChange={(e) => setIngredientMinStock(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label>Egységár (Ft)</Label>
                <Input
                  type="number"
                  value={ingredientCost}
                  onChange={(e) => setIngredientCost(e.target.value)}
                  placeholder="Opcionális"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Beszállító</Label>
              <Input
                value={ingredientSupplier}
                onChange={(e) => setIngredientSupplier(e.target.value)}
                placeholder="Opcionális"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeIngredientDialog}>
              Mégse
            </Button>
            <Button onClick={saveIngredient} disabled={saving}>
              {saving ? 'Mentés...' : 'Mentés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recept párbeszédablak */}
      <Dialog open={recipeDialog} onOpenChange={setRecipeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alapanyag Hozzáadása a Recepthez</DialogTitle>
            <DialogDescription>
              Állítsd be, mely alapanyagok használatosak a menütételben
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Menütétel</Label>
              <select
                value={selectedMenuItem}
                onChange={(e) => setSelectedMenuItem(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Válassz tételt</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Alapanyag</Label>
              <select
                value={recipeIngredientId}
                onChange={(e) => setRecipeIngredientId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Válassz alapanyagot</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Mennyiség tételenként</Label>
              <Input
                type="number"
                step="0.01"
                value={recipeQuantity}
                onChange={(e) => setRecipeQuantity(e.target.value)}
                placeholder="Adagonként felhasznált mennyiség"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRecipeDialog}>
              Mégse
            </Button>
            <Button onClick={saveRecipeIngredient} disabled={saving}>
              {saving ? 'Hozzáadás...' : 'Hozzáadás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Készlet módosítás párbeszédablak */}
      <Dialog open={stockDialog} onOpenChange={setStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stockAdjustmentType === 'add' ? 'Készlet Hozzáadása' : 'Készlet Csökkentése'}
            </DialogTitle>
            <DialogDescription>
              {adjustingIngredient?.name} - Jelenleg: {adjustingIngredient?.current_stock}{' '}
              {adjustingIngredient?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{stockAdjustmentType === 'add' ? 'Hozzáadandó' : 'Csökkentendő'} mennyiség</Label>
              <Input
                type="number"
                step="0.01"
                value={stockAdjustment}
                onChange={(e) => setStockAdjustment(e.target.value)}
                placeholder="Add meg a mennyiséget"
              />
            </div>
            <div className="space-y-2">
              <Label>Megjegyzés (opcionális)</Label>
              <Textarea
                value={stockNote}
                onChange={(e) => setStockNote(e.target.value)}
                placeholder="pl.: Beszállítói szállítmány, Selejtezés"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeStockDialog}>
              Mégse
            </Button>
            <Button onClick={adjustStock} disabled={saving}>
              {saving ? 'Frissítés...' : 'Megerősítés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Trash2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
