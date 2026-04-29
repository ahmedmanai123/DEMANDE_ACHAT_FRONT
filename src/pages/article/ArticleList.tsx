// src/pages/article/ArticleList.tsx
import {
	Box,
	Button,
	Chip,
	FormControl,
	MenuItem,
	Select,
	Stack,
	TablePagination,
	TextField,
	Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useMemo, useRef, useState } from "react";
import { useArticleStore } from "@/store/useArticleStore";
import type { IArticle } from "@/types/article";

// ================================================================
// STYLES (Layout only — Table styles handled by MUI DataGrid)
// ================================================================
const STYLES = `
  .art-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    background: #f4f6f9;
    padding: 12px;
    box-sizing: border-box;
  }

  .art-main {
    display: flex;
    gap: 12px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .art-card {
    flex: 1;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    padding: 16px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .art-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .art-filters {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }

  .art-filter-field {
    min-width: 150px;
  }

  .art-actions {
    display: flex;
    gap: 8px;
  }

  .art-data-grid {
    flex: 1;
    min-height: 0;
  }

  .art-ref {
    color: #1a4f78;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: color 0.2s;
  }
  .art-ref:hover { color: #2c5282; text-decoration: underline; }
`;

interface Props {
	onEdit: (cbMarq: number) => void;
	onNew: () => void;
}

// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================
export default function ArticleList({ onEdit, onNew }: Props) {
	const { articles, loading, filter, setFilter, fetchArticles, fetchDepots, selectedId, setSelectedId, deleteArticle } =
		useArticleStore();

	const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
	const [colFilters, setColFilters] = useState<Record<string, string>>({});
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: fetchArticles/fetchDepots called on mount
	useEffect(() => {
		fetchDepots();
		fetchArticles();
	}, []); // eslint-disable-line
	// biome-ignore lint/correctness/useExhaustiveDependencies: fetchArticles/fetchDepots called on mount
	useEffect(() => {
		fetchArticles();
	}, [filter]); // eslint-disable-line

	// Debug pour voir la structure des données
	useEffect(() => {
		console.log("Articles reçus:", articles);
		if (articles.length > 0) {
			console.log("Premier article:", articles[0]);
			console.log("Clés du premier article:", Object.keys(articles[0] || {}));
		}
	}, [articles]);

	// Met à jour le filtre colonne avec debounce
	const updateColFilter = (field: string, value: string) => {
		if (debounce.current) clearTimeout(debounce.current);
		debounce.current = setTimeout(() => {
			setColFilters((prev) => ({ ...prev, [field]: value }));
		}, 300);
	};

	// Colonnes du DataGrid
	const columns: GridColDef[] = useMemo(
		() => [
			{
				field: "aR_Ref",
				headerName: "Référence",
				width: 150,
				renderCell: (params) => (
					// biome-ignore lint/a11y/useValidAnchor: <explanation>
					<a
						href="#"
						className="art-ref"
						onClick={(e) => {
							e.preventDefault();
							onEdit(params.row.cbMarq);
						}}
					>
						{params.value}
					</a>
				),
			},
			{ field: "aR_Design", headerName: "Désignation", width: 300, flex: 1 },
			{
				field: "fA_CodeFamille",
				headerName: "Famille",
				width: 120,
			},
			{
				field: "aR_PrixVen",
				headerName: "Prix Vente",
				width: 100,
				type: "number",
				valueFormatter: (params) => {
					const value = params?.value;
					return value != null ? `${Number(value).toFixed(2)} €` : "";
				},
			},
			{
				field: "aR_PrixAch",
				headerName: "Prix Achat",
				width: 100,
				type: "number",
				valueFormatter: (params) => {
					const value = params?.value;
					return value != null ? `${Number(value).toFixed(2)} €` : "";
				},
			},
			{
				field: "totalStock",
				headerName: "Stock",
				width: 80,
				type: "number",
			},
			{
				field: "DE_No",
				headerName: "Dépôt",
				width: 100,
				renderCell: (params) => {
					const depot = params.row.depot;
					return depot ? depot.dE_Intitule : params.value;
				},
			},
			{
				field: "aR_Photo",
				headerName: "Image",
				width: 80,
				renderCell: (params) => {
					if (!params.value) return null;
					return (
						<img
							src={params.value}
							alt="Article"
							style={{ width: 40, height: 40, objectFit: "cover", cursor: "pointer" }}
							onClick={() => setLightboxSrc(params.value)}
						/>
					);
				},
			},
		],
		[onEdit],
	);

	return (
		<>
			<style>{STYLES}</style>
			<div className="art-page">
				<div className="art-main">
					<div className="art-card">
						<div className="art-toolbar">
							<div className="art-filters">
								<FormControl size="small" className="art-filter-field">
									<TextField
										size="small"
										placeholder="Référence"
										onChange={(e) => updateColFilter("AR_Ref", e.target.value)}
									/>
								</FormControl>
								<FormControl size="small" className="art-filter-field">
									<TextField
										size="small"
										placeholder="Désignation"
										onChange={(e) => updateColFilter("AR_Design", e.target.value)}
									/>
								</FormControl>
								<FormControl size="small" className="art-filter-field">
									<Select
										displayEmpty
										value={filter.DE_No ?? ""}
										onChange={(e) => setFilter({ DE_No: e.target.value || undefined })}
									>
										<MenuItem value="">Tous les dépôts</MenuItem>
										{/* Les options de dépôts seront ajoutées depuis le store */}
									</Select>
								</FormControl>
							</div>
						</div>

						{/* Pagination en haut */}
						<TablePagination
							component="div"
							count={articles.length}
							page={page}
							onPageChange={(_, newPage) => setPage(newPage)}
							rowsPerPage={rowsPerPage}
							onRowsPerPageChange={(e) => {
								setRowsPerPage(parseInt(e.target.value, 10));
								setPage(0);
							}}
							rowsPerPageOptions={[5, 10, 20, 50, 100]}
							labelRowsPerPage="Lignes par page"
							labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
							sx={{ borderBottom: "1px solid #e2e8f0" }}
						/>

						<Box className="art-data-grid">
							<DataGrid
								rows={articles}
								columns={columns}
								loading={loading}
								pageSizeOptions={[5, 10, 20, 50, 100]}
								getRowId={(row) => row.cbMarq}
								pagination
								paginationMode="client"
								autoHeight={false}
								sx={{
									"& .MuiDataGrid-root": {
										border: "none",
									},
									"& .MuiDataGrid-columnHeaders": {
										backgroundColor: "#f8fafc",
										borderBottom: "1px solid #e2e8f0",
									},
									"& .MuiDataGrid-cell": {
										borderBottom: "1px solid #f1f5f9",
									},
								}}
							/>
						</Box>
					</div>
				</div>
			</div>

			{/* Lightbox pour les images */}
			{lightboxSrc && (
				// biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(0,0,0,0.8)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 9999,
						cursor: "pointer",
					}}
					onClick={() => setLightboxSrc(null)}
				>
					<img
						src={lightboxSrc}
						alt="Agrandissement"
						style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }}
					/>
				</div>
			)}
		</>
	);
}
