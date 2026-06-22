'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Edit2,
  Trash2,
  UtensilsCrossed,
  Search,
  Image,
} from 'lucide-react';
import { supabase, MenuCategory, MenuItem, MenuItemWithCategory } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const [categoryDialog, setCategoryDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemAvailable, setItemAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [{ data: categoriesData }, { data: itemsData }] = await Promise.all([
        supabase.from('menu_categories').select('*').order('display_order'),
        supabase.from('menu_items').select('*, category:menu_categories(*)').order('display_order'),
      ]);

      setCategories(categoriesData || []);
      setMenuItems(itemsData as MenuItemWithCategory[] || []);
    } catch (error) {
      console.error('Hiba a menü betöltésekor:', error);
      toast.error('Nem sikerült betölteni a menüadatokat');
    } finally {
      setLoading(false);
    }
  }

  async function saveCategory() {
    if (!categoryName.trim()) {
      toast.error('A kategória neve kötelező');
      return;
    }
    setSaving(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('menu_categories')
          .update({ name: categoryName, description: categoryDescription })
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Kategória frissítve');
      } else {
        const { error } = await supabase.from('menu_categories').insert({
          name: categoryName,
          description: categoryDescription,
          display_order: categories.length,
        });
        if (error) throw error;
        toast.success('Kategória létrehozva');
      }
      closeCategoryDialog();
      loadData();
    } catch (error) {
      console.error('Hiba a kategória mentésekor:', error);
      toast.error('Nem sikerült menteni a kategóriát');
    } finally {
      setSaving(false);
    }
  }

  async function saveItem() {
    if (!itemName.trim() || !itemPrice) {
      toast.error('A név és az ár kötelező');
      return;
    }
    setSaving(true);
    try {
      const price = parseFloat(itemPrice);
      if (isNaN(price) || price < 0) {
        toast.error('Érvénytelen ár');
        setSaving(false);
        return;
      }
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: itemName,
            description: itemDescription,
            price,
            category_id: itemCategory || null,
            is_available: itemAvailable,
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Tétel frissítve');
      } else {
        const { error } = await supabase.from('menu_items').insert({
          name: itemName,
          description: itemDescription,
          price,
          category_id: itemCategory || null,
          is_available: itemAvailable,
          display_order: menuItems.length,
        });
        if (error) throw error;
        toast.success('Tétel létrehozva');
      }
      closeItemDialog();
      loadData();
    } catch (error) {
      console.error('Hiba a tétel mentésekor:', error);
      toast.error('Nem sikerült menteni a tételt');
    } finally {
      setSaving(false);
    }
  }

  async function toggleItemAvailability(item: MenuItem) {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);
      if (error) throw error;
      toast.success(item.is_available ? 'Tétel elrejtve' : 'Tétel megjelenítve');
      loadData();
    } catch (error) {
      console.error('Hiba:', error);
      toast.error('Nem sikerült frissíteni a tételt');
    }
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm('Biztosan törölni szeretnéd ezt a tételt?')) return;
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
      if (error) throw error;
      toast.success('Tétel törölve');
      loadData();
    } catch (error) {
      console.error('Hiba:', error);
      toast.error('Nem sikerült törölni a tételt');
    }
  }

  async function deleteCategory(category: MenuCategory) {
    if (!confirm('Biztosan törölni szeretnéd ezt a kategóriát? A tételek kategória nélkül maradnak.')) return;
    try {
      const { error } = await supabase.from('menu_categories').delete().eq('id', category.id);
      if (error) throw error;
      toast.success('Kategória törölve');
      loadData();
    } catch (error) {
      console.error('Hiba:', error);
      toast.error('Nem sikerült törölni a kategóriát');
    }
  }

  function openCategoryDialog(category?: MenuCategory) {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryDescription(category.description || '');
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
    }
    setCategoryDialog(true);
  }

  function openItemDialog(item?: MenuItem) {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemDescription(item.description || '');
      setItemPrice(item.price.toString());
      setItemCategory(item.category_id || '');
      setItemAvailable(item.is_available);
    } else {
      setEditingItem(null);
      setItemName('');
      setItemDescription('');
      setItemPrice('');
      setItemCategory('');
      setItemAvailable(true);
    }
    setItemDialog(true);
  }

  function closeCategoryDialog() {
    setCategoryDialog(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
  }

  function closeItemDialog() {
    setItemDialog(false);
    setEditingItem(null);
    setItemName('');
    setItemDescription('');
    setItemPrice('');
    setItemCategory('');
    setItemAvailable(true);
  }

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
          <h1 className="text-3xl font-bold">Menü Kezelés</h1>
          <p className="text-muted-foreground">Kezeld a menü kategóriáit és tételeit</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCategoryDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Kategória hozzáadása
          </Button>
          <Button onClick={() => openItemDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Tétel hozzáadása
          </Button>
        </div>
      </div>

      {/* Szűrők */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tétel keresése..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList>
            <TabsTrigger value="all">Összes tétel</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Tételek rács */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nem található menütétel</p>
              <Button variant="link" onClick={() => openItemDialog()}>
                Add hozzá az első tételt
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className={!item.is_available ? 'opacity-60' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Image className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {item.description || 'Nincs leírás'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-primary">
                          {Number(item.price).toLocaleString('hu-HU')} Ft
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.category?.name || 'Kategória nélkül'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_available}
                      onCheckedChange={() => toggleItemAvailability(item)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.is_available ? 'Elérhető' : 'Rejtett'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openItemDialog(item)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Kategória párbeszédablak */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Kategória szerkesztése' : 'Új kategória'}</DialogTitle>
            <DialogDescription>Hozz létre kategóriákat a menütételek rendszerezéséhez</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Név</Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="pl.: Hamburgerek, Pizzák, Italok"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Leírás</Label>
              <Textarea
                id="categoryDescription"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Opcionális leírás"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCategoryDialog}>Mégse</Button>
            <Button onClick={saveCategory} disabled={saving}>
              {saving ? 'Mentés...' : 'Mentés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tétel párbeszédablak */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Tétel szerkesztése' : 'Új menütétel'}</DialogTitle>
            <DialogDescription>Adj hozzá új tételt a menühöz</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Név</Label>
              <Input
                id="itemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="pl.: Klasszikus Burger"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemDescription">Leírás</Label>
              <Textarea
                id="itemDescription"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Lédús marhahús pogácsa friss zöldségekkel..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemPrice">Ár (Ft)</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="2500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemCategory">Kategória</Label>
                <select
                  id="itemCategory"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Nincs kategória</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="itemAvailable" checked={itemAvailable} onCheckedChange={setItemAvailable} />
              <Label htmlFor="itemAvailable">Rendelhető</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeItemDialog}>Mégse</Button>
            <Button onClick={saveItem} disabled={saving}>
              {saving ? 'Mentés...' : 'Mentés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
