import React, { useState, useMemo, useEffect } from 'react';
import { useCatalog } from '../hooks/useCatalog';
import { MASTER_CATALOG } from '../catalogData';
import { CatalogItem } from '../types';
import { toast } from 'sonner';
import { Search, ChevronLeft, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EQUIPMENT_TYPES = [
  { id: 'ST2G', label: 'ST2G', icon: '🔧' },
  { id: 'ST2D', label: 'ST2D', icon: '🔧' },
  { id: 'T23', label: 'MONTABERT T23', icon: '⛏️' },
  { id: 'T28', label: 'MONTABERT T28', icon: '⛏️' },
  { id: 'CONSOMMABLES_EPI_OUTILS', label: 'CONSOM. & EPI & OUTILS', icon: '📦' }
];

const getItemTabs = (item: CatalogItem): string[] => {
  const tabs: string[] = [];
  const suggestedType = (item.suggestedType || '') as string;
  
  if (suggestedType === 'CONSOMMABLES' || suggestedType === 'EPI' || suggestedType === 'OUTILS_TRAVAUX' || suggestedType === 'OUTILS') {
    tabs.push('CONSOMMABLES_EPI_OUTILS');
    return tabs;
  }
  
  const compat = (item.compatibility || '').toUpperCase();
  
  const hasST2G = compat.includes('ST2G');
  const hasST2D = compat.includes('ST2D');
  const hasT23 = compat.includes('T23');
  const hasT28 = compat.includes('T28');

  if (hasST2G) tabs.push('ST2G');
  if (hasST2D) tabs.push('ST2D');
  if (hasT23) tabs.push('T23');
  if (hasT28) tabs.push('T28');

  // Fallback checks if compatibility doesn't match standard patterns but item belongs elsewhere
  if (tabs.length === 0) {
    const desig = (item.designation || '').toUpperCase();
    const id = (item.id || '').toUpperCase();
    const ref = (item.reference || '').toUpperCase();
    const hasST2GAlt = desig.includes('ST2G') || id.includes('ST2G') || ref.includes('ST2G');
    const hasST2DAlt = desig.includes('ST2D') || id.includes('ST2D') || ref.includes('ST2D');
    const hasT23Alt = desig.includes('T23') || id.includes('T23') || ref.includes('T23') || desig.includes('T-23');
    const hasT28Alt = desig.includes('T28') || id.includes('T28') || ref.includes('T28') || desig.includes('T-28');

    if (hasST2GAlt) tabs.push('ST2G');
    if (hasST2DAlt) tabs.push('ST2D');
    if (hasT23Alt) tabs.push('T23');
    if (hasT28Alt) tabs.push('T28');
  }

  // Absolute fallback based on suggestedType if still completely empty
  if (tabs.length === 0) {
    if (suggestedType === 'ENGINS') {
      tabs.push('ST2G');
    } else if (suggestedType === 'PERFORATEURS') {
      tabs.push('T23');
    } else {
      tabs.push('ST2G'); // Absolute fallback
    }
  }

  return tabs;
};

export const MasterCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { hydrominesCatalog, addToHydrominesCatalog } = useCatalog();
  
  const [selectedType, setSelectedType] = useState('ST2G');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filter original CATALOG list based on Search query
  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return MASTER_CATALOG;
    const query = searchQuery.toLowerCase().trim();
    return MASTER_CATALOG.filter(item => {
      const name = (item.component || item.subCategory || '').toLowerCase();
      const ref = (item.reference || '').toLowerCase();
      const desc = (item.designation || '').toLowerCase();
      const common = (item.commonName || '').toLowerCase();
      return name.includes(query) || ref.includes(query) || desc.includes(query) || common.includes(query);
    });
  }, [searchQuery]);

  // 2. Performance - Index Pré-calculé
  const useCatalogHierarchy = (catalogItems: CatalogItem[]) => {
    return useMemo(() => {
      const hierarchy: Record<string, any> = {};
      
      // Initialize hierarchy keys for all tabs
      EQUIPMENT_TYPES.forEach(t => {
        hierarchy[t.id] = { categories: {} };
      });

      for (const item of catalogItems) {
        const itemTabs = getItemTabs(item);
        
        for (const type of itemTabs) {
          const cat = item.functionalCategory || 'Non classé';
          if (!hierarchy[type].categories[cat]) {
            hierarchy[type].categories[cat] = {
              name: cat,
              isLeaf: false,
              subCategories: {}
            };
          }
          
          const subCat = item.subCategory || 'Non spécifié';
          if (!hierarchy[type].categories[cat].subCategories[subCat]) {
            const hasComponents = !!item.component;
            hierarchy[type].categories[cat].subCategories[subCat] = {
              name: subCat,
              isLeaf: !hasComponents,
              components: {},
              reference: item.reference,
              price: item.price || 0,
              unit: item.unit || 'PIECE',
              criticality: item.criticality || 'MOYENNE',
              suggestedType: item.suggestedType || 'ENGINS',
              compatibility: item.compatibility,
            };
          }
          
          if (item.component) {
            hierarchy[type].categories[cat].subCategories[subCat].components[item.component] = {
              name: item.component,
              reference: item.reference,
              price: item.price || 0,
              unit: item.unit || 'PIECE',
              criticality: item.criticality || 'MOYENNE',
              isLeaf: true,
              suggestedType: item.suggestedType || 'ENGINS',
              compatibility: item.compatibility,
            };
          }
        }
      }
      
      return hierarchy;
    }, [catalogItems]);
  };

  const hierarchy = useCatalogHierarchy(filteredCatalog);

  // Auto-selection of first items when type or search changes
  useEffect(() => {
    const typeData = hierarchy[selectedType] || { categories: {} };
    const cats = Object.keys(typeData.categories);
    if (cats.length > 0) {
      cats.sort();
      const firstCat = cats[0];
      setSelectedCategory(firstCat);
      
      const subCats = Object.keys(typeData.categories[firstCat].subCategories);
      if (subCats.length > 0) {
        subCats.sort();
        setSelectedSubCategory(subCats[0]);
      } else {
        setSelectedSubCategory(null);
      }
    } else {
      setSelectedCategory(null);
      setSelectedSubCategory(null);
    }
  }, [selectedType, hierarchy]);

  const selectCategory = (catId: string) => {
    setSelectedCategory(catId);
    const typeData = hierarchy[selectedType] || { categories: {} };
    if (typeData.categories[catId]) {
      const subCats = Object.keys(typeData.categories[catId].subCategories);
      if (subCats.length > 0) {
        subCats.sort();
        setSelectedSubCategory(subCats[0]);
      } else {
        setSelectedSubCategory(null);
      }
    } else {
      setSelectedSubCategory(null);
    }
  };

  const selectSubCategory = (subCatId: string) => {
    setSelectedSubCategory(subCatId);
  };

  // Set of imported refs for O(1) checking
  const importedRefs = useMemo(() => {
    return new Set((hydrominesCatalog || []).map(hc => hc.reference.trim().toUpperCase()));
  }, [hydrominesCatalog]);

  const isItemImported = (ref: string) => {
    return importedRefs.has(ref.trim().toUpperCase());
  };

  // Add to Hydromines logic
  const addToHydromines = async (item: any) => {
    if (!item.isLeaf && !item.components) {
      toast.error("❌ Les catégories ne sont pas des pièces. Vous ne pouvez ajouter que des composants.");
      return;
    }

    // Determine target stock type
    let targetType: string = 'ENGINS';
    const itemSuggestedType = item.suggestedType as string;
    
    if (itemSuggestedType === 'CONSOMMABLES' || itemSuggestedType === 'EPI' || itemSuggestedType === 'OUTILS_TRAVAUX' || itemSuggestedType === 'OUTILS') {
      targetType = itemSuggestedType === 'OUTILS' ? 'OUTILS_TRAVAUX' : itemSuggestedType;
    } else {
      if (selectedType === 'ST2G' || selectedType === 'ST2D') {
        targetType = 'ENGINS';
      } else if (selectedType === 'T23' || selectedType === 'T28') {
        targetType = 'PERFORATEURS';
      } else {
        targetType = 'ENGINS';
      }
    }

    try {
      await addToHydrominesCatalog(item, targetType, selectedCategory!, selectedSubCategory || undefined);
    } catch (err) {
      console.error(err);
    }
  };

  // Extract lists for columns
  const typeData = hierarchy[selectedType] || { categories: {} };
  const categoriesList = useMemo(() => {
    return Object.keys(typeData.categories).map(catId => ({
      id: catId,
      name: typeData.categories[catId].name,
      ...typeData.categories[catId]
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [typeData, selectedType]);

  const subCategoriesList = useMemo(() => {
    if (!selectedCategory || !typeData.categories[selectedCategory]) return [];
    return Object.keys(typeData.categories[selectedCategory].subCategories).map(subCatId => ({
      id: subCatId,
      name: typeData.categories[selectedCategory].subCategories[subCatId].name,
      ...typeData.categories[selectedCategory].subCategories[subCatId]
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [typeData, selectedCategory]);

  const componentsList = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory || !typeData.categories[selectedCategory]?.subCategories[selectedSubCategory]) return [];
    return Object.keys(typeData.categories[selectedCategory].subCategories[selectedSubCategory].components).map(compId => ({
      id: compId,
      ...typeData.categories[selectedCategory].subCategories[selectedSubCategory].components[compId]
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [typeData, selectedCategory, selectedSubCategory]);

  return (
    <div className="master-catalog-page flex flex-col min-h-screen bg-white text-slate-800 font-sans selection:bg-amber-500/20 selection:text-amber-800">
      {/* Upper Navigation Bar / Premium Gold Header */}
      <div className="flex flex-col md:flex-row justify-between items-center px-6 py-4 bg-white border-b border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl transition-all"
            title="Retour au Cockpit"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500"><Award size={20} className="animate-pulse" /></span>
              <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-900 uppercase">
                Catalogue Master
              </h1>
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">
              Référentiel central des pièces de rechange certifiées pour l'exploitation minière souterraine.
            </p>
          </div>
        </div>

        {/* Dynamic Global Search in Header */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Rechercher une pièce ou référence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded hover:text-slate-700"
            >
              Vider
            </button>
          )}
        </div>
      </div>

      {/* A. BANNIÈRE (Onglets par type d'équipement) */}
      <div className="gold-banner">
        {EQUIPMENT_TYPES.map(tab => {
          const isActive = selectedType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedType(tab.id);
                setSearchQuery(''); // reset search when tab changes for smooth navigation
              }}
              className={`gold-tab ${isActive ? 'active' : ''}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* B. NAVIGATION 3 NIVEAUX */}
      <div className="catalog-grid flex-1">
        
        {/* Colonne 1 : Catégories */}
        <div className="catalog-column">
          <div className="flex justify-between items-center column-title">
            <h3>📂 Catégories ({categoriesList.length})</h3>
            <span className="text-[10px] text-slate-400 font-mono">BOM L1</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1">
            {categoriesList.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500 p-4 border border-dashed border-slate-200 rounded-xl">
                <span className="text-xl mb-2">📂</span>
                <p className="text-xs">Aucune catégorie disponible</p>
              </div>
            ) : (
              categoriesList.map(cat => (
                <div 
                  key={cat.id} 
                  className={`catalog-item ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => selectCategory(cat.id)}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded font-mono font-medium">
                    {Object.keys(cat.subCategories).length}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Colonne 2 : Sous-catégories */}
        <div className="catalog-column">
          <div className="flex justify-between items-center column-title">
            <h3>📁 Sous-catégories ({subCategoriesList.length})</h3>
            <span className="text-[10px] text-slate-400 font-mono">BOM L2</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1">
            {!selectedCategory ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl">
                <span className="text-xl mb-2">👈</span>
                <p className="text-xs">Sélectionnez une catégorie à gauche</p>
              </div>
            ) : subCategoriesList.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl">
                <span className="text-xl mb-2">📁</span>
                <p className="text-xs">Aucune sous-catégorie disponible</p>
              </div>
            ) : (
              subCategoriesList.map(sub => {
                const isImported = sub.isLeaf && isItemImported(sub.reference || '');
                return (
                  <div 
                    key={sub.id} 
                    className={`catalog-item ${selectedSubCategory === sub.id ? 'active' : ''}`}
                    onClick={() => selectSubCategory(sub.id)}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{sub.name}</span>
                      {sub.isLeaf && (
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">{sub.reference}</span>
                      )}
                    </div>
                    {sub.isLeaf ? (
                      <button 
                        className={`add-btn-small ${isImported ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : ''}`} 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (!isImported) {
                            addToHydromines(sub); 
                          } else {
                            toast.info("Cette pièce est déjà présente dans le catalogue Hydromines");
                          }
                        }}
                        title={isImported ? "Déjà importé dans le Catalogue Hydromines" : "Importer dans le Catalogue Hydromines"}
                      >
                        {isImported ? '✓' : '⭐'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded font-mono font-medium">
                        {Object.keys(sub.components || {}).length}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Colonne 3 : Composants (Pièces) */}
        <div className="catalog-column">
          <div className="flex justify-between items-center column-title">
            <h3>🔧 Composants ({componentsList.length})</h3>
            <span className="text-[10px] text-slate-400 font-mono">BOM L3</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {!selectedSubCategory ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl">
                <span className="text-xl mb-2">👈</span>
                <p className="text-xs">Sélectionnez une sous-catégorie à gauche</p>
              </div>
            ) : componentsList.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl">
                <span className="text-xl mb-2">🔧</span>
                <p className="text-xs">Aucun composant ou pièce directe disponible</p>
              </div>
            ) : (
              componentsList.map(comp => {
                const isImported = isItemImported(comp.reference);
                return (
                  <div key={comp.id} className="catalog-item component bg-slate-50 border border-slate-200 hover:border-amber-500/30 transition-all rounded-xl p-4">
                    <div className="comp-info">
                      <div className="flex justify-between items-start w-full gap-2">
                        <span className="comp-name font-bold text-slate-800">{comp.name}</span>
                        {comp.criticality === 'CRITIQUE' && (
                          <span className="text-[9px] font-black tracking-widest bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200 uppercase shrink-0">
                            CRITIQUE
                          </span>
                        )}
                        {comp.criticality === 'HAUTE' && (
                          <span className="text-[9px] font-black tracking-widest bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200 uppercase shrink-0">
                            HAUTE
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          OEM: {comp.reference}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {comp.unit || 'PIECE'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-amber-600 font-semibold mt-2 flex items-baseline gap-1">
                        <span>{comp.price.toLocaleString('fr-MA')}</span>
                        <span className="text-[10px] text-slate-500 font-medium">MAD</span>
                      </div>
                    </div>
                    
                    <div className="w-full mt-3">
                      <button 
                        className={`add-btn-gold flex items-center justify-center gap-2 ${
                          isImported 
                            ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/40 text-emerald-600 cursor-not-allowed shadow-none hover:transform-none' 
                            : ''
                        }`} 
                        onClick={() => {
                          if (!isImported) {
                            addToHydromines(comp);
                          } else {
                            toast.info("Cette pièce est déjà présente dans le catalogue Hydromines");
                          }
                        }}
                        disabled={isImported}
                      >
                        <span>{isImported ? '✓' : '⭐'}</span>
                        <span>{isImported ? 'Présent dans Hydromines' : 'Ajouter au Catalogue Hydromines'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default MasterCatalogPage;
