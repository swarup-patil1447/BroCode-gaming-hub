import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { FoodItem, Station } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { UtensilsCrossed, Plus, Edit2, Trash2, CheckCircle2, ShoppingBag } from 'lucide-react';

export const FoodMenu: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const isOwner = role === 'OWNER';

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('SNACKS');
  const [itemPrice, setItemPrice] = useState('');

  // Order food to station state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});

  const { data: foodCatalog = [], isLoading } = useQuery({
    queryKey: ['food'],
    queryFn: () => api.food.getAll(),
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: () => api.stations.getAll(),
  });

  const occupiedStations = stations.filter((s) => s.isOccupied && s.currentBooking);

  const saveItemMutation = useMutation({
    mutationFn: () => {
      const price = parseFloat(itemPrice) || 0;
      if (editingItem) {
        return api.food.update(editingItem.id, {
          name: itemName,
          category: itemCategory,
          price,
        });
      } else {
        return api.food.create({
          name: itemName,
          category: itemCategory,
          price,
          isAvailable: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food'] });
      setIsItemModalOpen(false);
      setEditingItem(null);
      setItemName('');
      setItemPrice('');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => api.food.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food'] });
    },
  });

  const addFoodOrderMutation = useMutation({
    mutationFn: () => {
      const targetStation = occupiedStations.find((s) => s.id === selectedStationId);
      if (!targetStation || !targetStation.currentBooking) {
        throw new Error('Please select an active occupied station');
      }
      const items = Object.entries(orderQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([foodItemId, quantity]) => ({ foodItemId, quantity }));

      return api.bookings.addFood(targetStation.currentBooking.id, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setIsOrderModalOpen(false);
      setOrderQuantities({});
      alert('Food order added to customer bill successfully!');
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory('SNACKS');
    setItemPrice('');
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: FoodItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemPrice(item.price.toString());
    setIsItemModalOpen(true);
  };

  const categories: string[] = Array.from(new Set(foodCatalog.map((f: FoodItem) => f.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
            FOOD & DRINKS MENU
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage cafe snacks, beverages, and order refreshments directly to active gaming tables
          </p>
        </div>

        <div className="flex items-center gap-3">
          {occupiedStations.length > 0 && (
            <Button
              variant="magenta"
              onClick={() => {
                setSelectedStationId(occupiedStations[0].id);
                setIsOrderModalOpen(true);
              }}
              leftIcon={<ShoppingBag className="h-4 w-4" />}
            >
              ORDER TO TABLE
            </Button>
          )}

          {isOwner && (
            <Button
              variant="primary"
              onClick={openCreateModal}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              ADD MENU ITEM
            </Button>
          )}
        </div>
      </div>

      {/* Menu Sections by Category */}
      {categories.length === 0 ? (
        <div className="p-8 text-center text-slate-500 rounded-2xl bg-dark-900 border border-slate-800">
          No food items added yet.
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="space-y-3">
            <h3 className="font-display font-bold text-lg text-cyber-cyan tracking-wider uppercase">
              {cat}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {foodCatalog
                .filter((f) => f.category === cat)
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-white text-base truncate">
                          {item.name}
                        </span>
                        <Badge variant={item.isAvailable ? 'available' : 'cancelled'}>
                          {item.isAvailable ? 'In Stock' : 'Out'}
                        </Badge>
                      </div>
                      <p className="font-mono font-black text-xl text-cyber-amber">
                        {formatCurrency(item.price)}
                      </p>
                    </div>

                    {isOwner && (
                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-dark-850 text-slate-300 hover:text-white"
                          title="Edit Price/Name"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          className="p-1.5 rounded-lg bg-dark-850 text-rose-400 hover:bg-rose-950"
                          title="Disable Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))
      )}

      {/* Owner Add / Edit Item Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
        subtitle="Configure name, category, and price"
        maxWidth="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveItemMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Item Name *"
            placeholder="e.g. Burger, Cold Drink"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
          />

          <Select
            label="Category *"
            value={itemCategory}
            onChange={(e) => setItemCategory(e.target.value)}
            options={[
              { value: 'SNACKS', label: 'Snacks & Fast Food' },
              { value: 'DRINKS', label: 'Cold Drinks & Beverages' },
              { value: 'COMBOS', label: 'Combos & Meals' },
            ]}
          />

          <Input
            label="Price (₹) *"
            type="number"
            min="1"
            placeholder="e.g. 120"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saveItemMutation.isPending}
            >
              SAVE ITEM
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Order to Table Modal */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Order Food to Table"
        subtitle="Select active table and food items"
        maxWidth="md"
      >
        <div className="space-y-4">
          <Select
            label="Select Active Table *"
            value={selectedStationId || ''}
            onChange={(e) => setSelectedStationId(Number(e.target.value))}
            options={occupiedStations.map((st) => ({
              value: st.id,
              label: `Table ${st.tableNumber} - ${st.currentBooking?.customerName} (${st.deviceType})`,
            }))}
          />

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {foodCatalog
              .filter((f) => f.isAvailable)
              .map((item) => {
                const qty = orderQuantities[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-xs font-mono text-slate-400">₹{item.price}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setOrderQuantities((prev) => ({
                            ...prev,
                            [item.id]: Math.max(0, (prev[item.id] || 0) - 1),
                          }))
                        }
                        className="h-8 w-8 rounded-lg bg-dark-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-sm w-4 text-center text-white">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOrderQuantities((prev) => ({
                            ...prev,
                            [item.id]: (prev[item.id] || 0) + 1,
                          }))
                        }
                        className="h-8 w-8 rounded-lg bg-dark-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="magenta"
              isLoading={addFoodOrderMutation.isPending}
              onClick={() => addFoodOrderMutation.mutate()}
            >
              ADD TO TABLE BILL
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
