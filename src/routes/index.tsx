// src/routes.ts (ou l'équivalent dans votre projet)


// -----------------------------------------------------------------
// OPTION A : Import Direct (Recommandé pour debugger ou petite app)
// -----------------------------------------------------------------

export const routes = [
  {
    order: 10,
    path: "/articles",
    component: () => import("@/pages/article/index"), // Gardez l'import dynamique si vous voulez
    meta: { title: "Articles", icon: "mdi:package-variant" },
  },
  {
    order: 11,
    // Le chemin doit correspondre exactement à ce qui est dans le menu
    path: "/besoin/demandes", 
    // Soit vous passez le composant directement :
    // component: DemandeBesoinPage, 
    
    // Soit vous gardez l'import dynamique (vérifiez que le chemin fichier est correct) :
    component: () => import("@/pages/besoin/DemandeBesoin.page"),
    
    meta: { title: "Demandes de besoin", icon: "mdi:file-document-outline" },
  },
  // ... autres routes
];