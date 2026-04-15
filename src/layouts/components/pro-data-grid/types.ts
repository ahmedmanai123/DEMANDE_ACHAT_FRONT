import type { ColumnsType } from "antd/es/table";

// ─── Réponse générique du serveur ──────────────────────────────────────────────
export interface GridResponse<T> {
  data: T[];
  itemsCount: number;
}

// ─── Paramètres de table (pagination + tri) ────────────────────────────────────
export interface TableParams {
  pageIndex: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Props du composant ProDataGrid ───────────────────────────────────────────
export interface ProDataGridProps<T extends object> {
  // Données
  dataSource?: T[];
  totalCount?: number;
  loading?: boolean;

  // Colonnes Ant Design
  columns: ColumnsType<T>;

  // Clé unique de chaque ligne
  rowKey: keyof T | ((record: T) => string);

  // Callback quand pagination ou tri change
  onTableChange?: (params: TableParams) => void;

  // Paramètres initiaux
  defaultPageSize?: number;
  defaultSortField?: string;
  defaultSortOrder?: "asc" | "desc";

  // Slot pour la barre de filtres (optionnel)
  filterBar?: React.ReactNode;

  // Export Excel
  exportFileName?: string;
  onExport?: () => void;

  // Titre de la page
  title?: string;

  // Hauteur du scroll
  scrollX?: number;

  // Taille de la table
  size?: "small" | "middle" | "large";
}
