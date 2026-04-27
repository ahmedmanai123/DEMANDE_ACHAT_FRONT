import { Box, Chip, FormControl, MenuItem, Select, Stack, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { articleApi } from "@/api/articleApi";
import { useFamilleStore } from "@/store/useFamilleStore";
import type { ICatalogue } from "@/types/article";

// ================================================================
// STYLES — Sidebar gauche + sous-catalogues en haut
// ================================================================
const STYLES = `
  .fam-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    background: #f4f6f9;
    padding: 12px;
    box-sizing: border-box;
  }

  .fam-main {
    display: flex;
    gap: 12px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* ---- Left sidebar (niveau 1) ---- */
  .fam-sidebar {
    width: 220px;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid #e1e4e8;
  }

  .fam-sidebar-header {
    padding: 14px 16px;
    font-size: 12px;
    font-weight: 800;
    color: #5c6b7f;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid #f0f2f5;
    background: #fafbfc;
    flex-shrink: 0;
  }

  .fam-sidebar-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 transparent;
  }
  .fam-sidebar-scroll::-webkit-scrollbar {
    width: 4px;
  }
  .fam-sidebar-scroll::-webkit-scrollbar-thumb {
    background-color: #cbd5e0;
    border-radius: 10px;
  }

  .fam-sidebar-item {
    padding: 9px 14px;
    font-size: 13px;
    color: #4a5568;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    border-left: 3px solid transparent;
  }

  .fam-sidebar-item:hover {
    background: #edf2f7;
    color: #2b6cb0;
  }

  .fam-sidebar-item.active {
    background: #ebf4ff;
    color: #1a4f78;
    font-weight: 600;
    border-left-color: #2b6cb0;
  }

  .fam-sidebar-arrow {
    font-size: 14px;
    color: #a0aec0;
    font-weight: 300;
  }
  .fam-sidebar-item:hover .fam-sidebar-arrow,
  .fam-sidebar-item.active .fam-sidebar-arrow {
    color: #2b6cb0;
  }

  /* ---- Right zone ---- */
  .fam-right {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
  }

  /* ---- Top sub-catalogue bar (niveaux 2+) ---- */
  .fam-cat-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: #f7f8fa;
    border: 1px solid #e1e4e8;
    border-bottom: none;
    border-radius: 10px 10px 0 0;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .fam-cat-bar-label {
    font-size: 11px;
    font-weight: 700;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-right: 4px;
  }

  .fam-cat-sep {
    font-size: 14px;
    color: #cbd5e0;
    margin: 0 2px;
  }

  /* ---- Main card ---- */
  .fam-card {
    flex: 1;
    min-height: 0;
    background: #fff;
    border-radius: 0 0 10px 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    border: 1px solid #e1e4e8;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .fam-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    border-bottom: 1px solid #f0f2f5;
    background: #fff;
    flex-shrink: 0;
  }

  .fam-ref {
    color: #1a4f78;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: color 0.2s;
  }
  .fam-ref:hover { color: #2c5282; text-decoration: underline; }
`;

// ================================================================
// TYPES
// ================================================================
interface CatLevel {
	items: ICatalogue[];
	selectedId: number;
	label: string;
}

interface Props {
	onEdit: (cbMarq: number) => void;
}

// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================
export default function FamillesPage({ onEdit }: Props) {
	const { familles, loading, pagination, catalogueSelection, fetchFamilles, setPagination, setCatalogueSelection } =
		useFamilleStore();

	// ---- Catalogue state (listes verticales en cascade) ----
	const [catLevels, setCatLevels] = useState<CatLevel[]>([]);
	const [, setCatLoading] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: fetchFamilles called on mount
	useEffect(() => {
		fetchFamilles();
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: fetchFamilles called on mount and catalogue change
	useEffect(() => {
		fetchFamilles();
	}, [catalogueSelection]);

	// Charger le premier niveau de catalogue au montage
	useEffect(() => {
		articleApi
			.getCatalogues(0, 0)
			.then(({ data }) => {
				const items: ICatalogue[] = [{ value: 0, text: "Tous", isParent: false }, ...(data ?? [])];
				setCatLevels([{ items, selectedId: 0, label: "Catalogue" }]);
			})
			.catch(() => {});
	}, []);

	// Met à jour le filtre catalogue à partir des niveaux
	const applyCatFilter = (levels: CatLevel[]) => {
		const ids = levels.map((l) => l.selectedId);
		const selection: Record<string, number> = {};
		for (let i = 1; i <= 4; i++) selection[`CL_No${i}`] = ids[i] ?? 0;
		setCatalogueSelection(selection as Parameters<typeof setCatalogueSelection>[0]);
	};

	// Changement de sélection catalogue — charge les enfants dans la colonne suivante
	const handleCatLevelChange = (levelIdx: number, value: number) => {
		const currentLevel = catLevels[levelIdx];
		if (!currentLevel) return;

		const cat = currentLevel.items.find((c) => c.value === value);
		if (!cat) return;

		// Garder les niveaux jusqu'au courant, mettre à jour la sélection
		const newLevels = catLevels
			.slice(0, levelIdx + 1)
			.map((l, i) => (i === levelIdx ? { ...l, selectedId: value } : l));

		if (cat.isParent && value !== 0) {
			setCatLoading(true);
			articleApi
				.getCatalogues(value, levelIdx + 1)
				.then(({ data }) => {
					setCatLoading(false);
					if (data && data.length > 0) {
						const children: ICatalogue[] = [{ value, text: "Tous", isParent: false }, ...data];
						newLevels.push({ items: children, selectedId: value, label: cat.text });
					}
					setCatLevels(newLevels);
					// Appliquer les filtres catalogue après mise à jour
					applyCatFilter(newLevels);
				})
				.catch(() => {
					setCatLoading(false);
					setCatLevels(newLevels);
					// Appliquer les filtres catalogue même en cas d'erreur
					applyCatFilter(newLevels);
				});
		} else {
			setCatLevels(newLevels);
			// Appliquer les filtres catalogue pour les sélections sans enfants
			applyCatFilter(newLevels);
		}
	};

	const columns: GridColDef[] = [
		{
			field: "FA_CodeFamille",
			headerName: "Code famille",
			width: 130,
			renderCell: (params) => (
				<button
					type="button"
					className="fam-ref"
					onClick={() => onEdit(params.row.cbMarq)}
					style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
				>
					{params.value as string}
				</button>
			),
		},
		{ field: "FA_Intitule", headerName: "Intitulé", width: 220, flex: 1 },
		{
			field: "FA_Type",
			headerName: "Type",
			width: 130,
			renderCell: (params) => {
				const value = params.value as number;
				const labels: Record<number, string> = { 0: "Détail", 1: "Total", 2: "Centralisateur" };
				const label = labels[value] ?? "";
				return (
					<Chip
						label={label}
						size="small"
						sx={{
							fontSize: 11,
							fontWeight: 600,
							borderRadius: 1,
							bgcolor: value === 0 ? "#48bb78" : value === 1 ? "#4299e1" : "#ed8936",
							color: "#fff",
						}}
					/>
				);
			},
		},
		{
			field: "FA_Central",
			headerName: "Centralisation",
			width: 130,
			renderCell: (params) => {
				const value = params.value as number;
				return value === 1 ? "Oui" : "Non";
			},
		},
		{
			field: "CL_Intitule1",
			headerName: "Catalogue article",
			width: 160,
		},
	];

	return (
		<>
			<style>{STYLES}</style>

			<div className="fam-page">
				<div className="fam-main">
					{/* ===== LEFT SIDEBAR — Catalogue niveau 1 ===== */}
					{catLevels.length > 0 && (
						<div className="fam-sidebar">
							<div className="fam-sidebar-header">Catalogue</div>
							<div className="fam-sidebar-scroll">
								{catLevels[0].items.map((cat, catIdx) => (
									<button
										key={`cat0-${catIdx}-${cat.value}`}
										type="button"
										className={`fam-sidebar-item ${catLevels[0].selectedId === cat.value ? "active" : ""}`}
										onClick={() => handleCatLevelChange(0, cat.value)}
										style={{
											width: "100%",
											textAlign: "left",
											background: "none",
											border: "none",
											padding: "9px 14px",
											cursor: "pointer",
										}}
									>
										<span>{cat.text}</span>
										{cat.isParent && <span className="fam-sidebar-arrow">›</span>}
									</button>
								))}
							</div>
						</div>
					)}

					{/* ===== RIGHT ZONE ===== */}
					<div className="fam-right">
						{/* ---- TOP BAR — Sous-catalogues (niveaux 2+) ---- */}
						{catLevels.length > 1 && (
							<div className="fam-cat-bar">
								{catLevels.slice(1).map((level, idx) => {
									const realIndex = idx + 1;
									return (
										<span key={`subcat-${realIndex}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
											<span className="fam-cat-sep">/</span>
											<span className="fam-cat-bar-label">{level.label}</span>
											<FormControl size="small" sx={{ minWidth: 160 }}>
												<Select
													value={level.selectedId}
													onChange={(e) => handleCatLevelChange(realIndex, e.target.value as number)}
													displayEmpty
												>
													{level.items.map((c, cIdx) => (
														<MenuItem key={`subcat${realIndex}-${cIdx}-${c.value}`} value={c.value}>
															<span
																style={{
																	display: "flex",
																	alignItems: "center",
																	justifyContent: "space-between",
																	gap: 12,
																	width: "100%",
																}}
															>
																<span>{c.text}</span>
																{c.isParent && (
																	<span style={{ fontSize: 12, color: "#a0aec0", fontWeight: 300 }}>›</span>
																)}
															</span>
														</MenuItem>
													))}
												</Select>
											</FormControl>
										</span>
									);
								})}
							</div>
						)}

						{/* ---- MAIN CARD ---- */}
						<div className="fam-card">
							{/* ---- TOOLBAR ---- */}
							<div className="fam-toolbar">
								<Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
									<Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1a202c" }}>
										Liste des Familles
									</Typography>
									<FormControl size="small" sx={{ width: 70 }}>
										<Select
											value={pagination.pageSize}
											onChange={(e) => setPagination({ pageSize: e.target.value as number, current: 1 })}
											displayEmpty
										>
											{[5, 10, 20, 50, 100].map((n) => (
												<MenuItem key={n} value={n}>
													{n}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								</Stack>
							</div>

							{/* ---- DATA GRID ---- */}
							<Box sx={{ flex: 1, minHeight: 0 }}>
								<DataGrid
									rows={familles}
									columns={columns}
									loading={loading}
									rowCount={pagination.total}
									paginationMode="server"
									getRowId={(row) => row.cbMarq}
									paginationModel={{
										page: pagination.current - 1,
										pageSize: pagination.pageSize,
									}}
									pageSizeOptions={[5, 10, 20, 50]}
									onPaginationModelChange={(model) => {
										setPagination({
											current: model.page + 1,
											pageSize: model.pageSize,
										});
									}}
									density="compact"
									sx={{
										"& .MuiDataGrid-row.Mui-selected": {
											bgcolor: "action.selected",
										},
									}}
									slots={{
										noRowsOverlay: () => (
											<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
												<Typography color="text.secondary">Aucune donnée</Typography>
											</Box>
										),
									}}
								/>
							</Box>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
