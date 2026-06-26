import React from 'react';
import { MouvementForm } from '../components/MouvementForm';
import { useInventory } from '../context/InventoryContext';
import { toast } from 'sonner';

export const BonEntreePage: React.FC = () => {
  const { currentSite, articles, catalog, engins, perfos, agents, selectedArticleId, saveArticle, isReadOnlyUser, addMouvement, setSelectedArticleId } = useInventory();

  return (
    <MouvementForm 
      type="ENTREE" 
      site={currentSite}
      articles={articles}
      catalog={catalog}
      engins={engins}
      perfos={perfos}
      agents={agents}
      initialArticleId={selectedArticleId || undefined}
      onArticleCreate={saveArticle}
      isReadOnly={isReadOnlyUser}
      onSubmit={async (m) => {
        try {
          await toast.promise(addMouvement(m), {
            loading: "Enregistrement du bon et mise à jour du stock...",
            success: "Mouvement enregistré et stock mis à jour !",
            error: (err: any) => `Échec : ${err.message || err}`
          });
          setSelectedArticleId(null);
        } catch (e) {
          console.error(e);
        }
      }}
    />
  );
};

export default BonEntreePage;
