import React, { useState } from 'react';
import { MouvementForm } from '../components/MouvementForm';
import { useInventory } from '../context/InventoryContext';
import { toast } from 'sonner';
import { logger } from '../lib/utils';

export const BonEntreePage: React.FC = () => {
  const [formKey, setFormKey] = useState(0);
  const { currentSite, articles, catalog, engins, perfos, agents, selectedArticleId, saveArticle, isReadOnlyUser, addMouvement, setSelectedArticleId } = useInventory();

  return (
    <MouvementForm 
      key={`${currentSite}-${formKey}`}
      resetKey={formKey}
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
          setFormKey(k => k + 1);
        } catch (e) {
          logger.error('[BonEntreePage] Erreur soumission:', e);
          throw e;
        }
      }}
    />
  );
};

export default BonEntreePage;
