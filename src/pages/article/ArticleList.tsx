// src/pages/article/ArticleList.tsx
import {
	Add as AddIcon,
	DeleteOutlined as DeleteIcon,
	EditOutlined as EditIcon,
} from "@mui/icons-material";
import {
	Box,
	Button,
	Chip,
	FormControl,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useMemo, useRef, useState } from "react";
import { useArticleStore } from "@/store/useArticleStore";
import type { IArticle, ICatalogue } from "@/types/article";

// ================================================================
// STYLES (Sidebar & Layout only — Table styles handled by MUI DataGrid)
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

  .art-sidebar {
    width: 240px;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid #e1e4e8;
  }

  .art-sidebar-header {
    padding: 16px 18px;
    font-size: 12px;
    font-weight: 800;
    color: #5c6b7f;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid #f0f2f5;
    background: #fafbfc;
    flex-shrink: 0;
  }

  .art-sidebar-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 transparent;
  }
  .art-sidebar-scroll::-webkit-scrollbar {
    width: 5px;
  }
  .art-sidebar-scroll::-webkit-scrollbar-thumb {
    background-color: #cbd5e0;
    border-radius: 10px;
  }

  .art-sidebar-item {
    margin: 2px 8px;
    padding: 10px 12px;
    font-size: 13.5px;
    color: #4a5568;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    border-radius: 6px;
  }

  .art-sidebar-item:hover {
    background: #f0f7ff;
    color: #1a4f78;
    transform: translateX(2px);
  }

  .art-sidebar-item.active {
    background: linear-gradient(90deg, rgba(26,79,120,0.1) 0%, rgba(255,255,255,0) 100%);
    color: #1a4f78;
    font-weight: 600;
    border-left: 4px solid #1a4f78;
    padding-left: 10px;
    border-radius: 4px 8px 8px 4px;
  }

  .art-sidebar-arrow {
    font-size: 16px;
    color: #cbd5e0;
    font-weight: 300;
    transition: color 0.2s;
  }
  .art-sidebar-item:hover .art-sidebar-arrow,
  .art-sidebar-item.active .art-sidebar-arrow {
    color: #1a4f78;
  }

  .art-card {
    flex: 1;
    min-width: 0;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    border: 1px solid #e1e4e8;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .art-cat-breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-bottom: 1px solid #f0f2f5;
    background: #fcfdfe;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .art-cat-sep {
    font-size: 14px;
    color: #cbd5e0;
    margin: 0 4px;
  }

  .art-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    border-bottom: 1px solid #f0f2f5;
    background: #fff;
    flex-shrink: 0;
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
	onNew: () => void;
}

// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================
export default function ArticleList({ onEdit, onNew }: Props) {
	const {
		articles,
		totalCount,
		loading,
		depots,
		filter,
		setFilter,
		fetchArticles,
		fetchDepots,
		selectedId,
		setSelectedId,
		deleteArticle,
	} = useArticleStore();

	const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
	const [colFilters, setColFilters] = useState<Record<string, string>>({});
	const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ---- Catalogue state ----
	const [catLevels, setCatLevels] = useState<CatLevel[]>([]);
	const [, setCatLoading] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: fetchArticles/fetchDepots called on mount
	useEffect(() => {
		fetchDepots();
		fetchArticles();
	}, []); // eslint-disable-line
	// biome-ignore lint/correctness/useExhaustiveDependencies: fetchArticles/fetchDepots called on mount
	useEffect(() => {
		fetchArticles();
	}, [filter]); // eslint-disable-line

	// Charger le premier niveau de catalogue au montage
	useEffect(() => {
		import("@/api/articleApi").then(({ articleApi }) => {
			articleApi
				.getCatalogues(0, 0)
				.then(({ data }) => {
					const items: ICatalogue[] = [{ value: 0, text: "Tous", isParent: false }, ...(data ?? [])];
					setCatLevels([{ items, selectedId: 0, label: "Catalogue" }]);
				})
				.catch(() => {});
		});
	}, []);

	// Met à jour le filtre catalogue à partir des niveaux
	const applyCatFilter = (levels: CatLevel[]) => {
		const ids = levels.map((l) => l.selectedId);
		const patch: Record<string, number> = {};
		for (let i = 1; i <= 4; i++) patch[`cL_No${i}`] = ids[i] ?? 0;
		setFilter(patch as Parameters<typeof setFilter>[0]);
	};

	// Changement de sélection
	const handleCatLevelChange = (levelIdx: number, value: number) => {
		const currentLevel = catLevels[levelIdx];
		if (!currentLevel) return;

		const cat = currentLevel.items.find((c) => c.value === value);
		if (!cat) return;

		const newLevels = catLevels
			.slice(0, levelIdx + 1)
			.map((l, i) => (i === levelIdx ? { ...l, selectedId: value } : l));

		if (cat.isParent && value !== 0) {
			setCatLoading(true);
			import("@/api/articleApi").then(({ articleApi }) => {
				articleApi
					.getCatalogues(value, levelIdx + 1)
					.then(({ data }) => {
						setCatLoading(false);
						if (data && data.length > 0) {
							const children: ICatalogue[] = [{ value, text: "Tous", isParent: false }, ...data];
							newLevels.push({ items: children, selectedId: value, label: cat.text });
						}
						setCatLevels(newLevels);
						applyCatFilter(newLevels);
					})
					.catch(() => {
						setCatLoading(false);
						setCatLevels(newLevels);
						applyCatFilter(newLevels);
					});
			});
		} else {
			setCatLevels(newLevels);
			applyCatFilter(newLevels);
		}
	};

	const handleColFilter = (field: string, value: string) => {
		const next = { ...colFilters, [field]: value };
		setColFilters(next);
		if (debounce.current) clearTimeout(debounce.current);
		debounce.current = setTimeout(() => {
			const map: Record<string, string> = {
				aR_Ref: "aR_Ref",
				aR_Design: "aR_Design",
				fA_Intitule: "fA_CodeFamille",
				aR_PrixAch: "aR_PrixAch",
			};
			const params = Object.fromEntries(
				Object.entries(next)
					.filter(([, v]) => v !== "")
					.map(([k, v]) => [map[k] ?? k, v]),
			);
			setFilter(params as Parameters<typeof setFilter>[0]);
		}, 400);
	};

	const depotCols = useMemo<GridColDef<IArticle>[]>(
		() =>
			depots.map((d) => ({
				field: `DE_${d.dE_No}`,
				headerName: d.dE_Intitule,
				width: 130,
				align: "right",
				renderCell: (params) => {
					const v = (params.row as Record<string, unknown>)[`DE_${d.dE_No}`];
					const n = typeof v === "number" ? v : 0;
					return (
						<span style={{ color: n > 0 ? "#2b6cb0" : "#a0aec0", fontWeight: n > 0 ? 600 : 400 }}>
							{n}
						</span>
					);
				},
			})),
		[depots],
	);

	const columns = useMemo<GridColDef<IArticle>[]>(
		() => [
			{
				field: "aR_Ref",
				headerName: "Référence",
				width: 130,
				renderCell: (params) => (
					<button
						type="button"
						className="art-ref"
						onClick={() => onEdit(params.row.cbMarq)}
						style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
					>
						{params.value as string}
					</button>
				),
			},
			{ field: "aR_Design", headerName: "Désignation", width: 220 },
			{ field: "fA_Intitule", headerName: "Famille", width: 160 },
			{
				field: "aR_PrixAch",
				headerName: "Prix Achat",
				width: 110,
				align: "right",
				renderCell: (params) =>
					params.value ? (
						<span style={{ fontWeight: 500, color: "#2d3748" }}>{(params.value as number).toFixed(3)}</span>
					) : (
						""
					),
			},
			...depotCols,
			{
				field: "totalStock",
				headerName: "Total Stock",
				width: 110,
				align: "right",
				renderCell: (params) => {
					const v = (params.value as number) ?? 0;
					return (
						<Chip
							label={v}
							size="small"
							sx={{
								minWidth: 40,
								fontSize: 11,
								fontWeight: 600,
								borderRadius: 1,
								bgcolor: v > 0 ? "#3182ce" : "#cbd5e0",
								color: "#fff",
							}}
						/>
					);
				},
			},
			{
				field: "aR_Photo",
				headerName: "Photo",
				width: 60,
				align: "center",
				sortable: false,
				filterable: false,
				renderCell: (params) =>
					params.value ? (
						<button
							type="button"
							style={{
								width: 32,
								height: 32,
								padding: 0,
								border: "none",
								background: "none",
								cursor: "pointer",
							}}
							onClick={(e) => {
								e.stopPropagation();
								setLightboxSrc(params.value as string);
							}}
						>
							<img
								src={params.value as string}
								alt=""
								style={{
									width: 32,
									height: 32,
									objectFit: "cover",
									borderRadius: 6,
									boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
								}}
							/>
						</button>
					) : null,
			},
		],
		[depotCols, onEdit],
	);

	const handleDelete = () => {
		if (!selectedId) return;
		if (window.confirm("Voulez-vous vraiment supprimer cet article ?")) {
			deleteArticle(selectedId);
		}
	};

	return (
		<>
			<style>{STYLES}</style>

			<div className="art-page">
				<div className="art-main">
					{/* ===== SIDEBAR (NIVEAU 1) ===== */}
					{catLevels.length > 0 && (
						<div className="art-sidebar">
							<div className="art-sidebar-header">Catalogue</div>
							<div className="art-sidebar-scroll">
								{catLevels[0].items.map((cat) => (
									<button
										key={cat.value}
										type="button"
										className={`art-sidebar-item ${catLevels[0].selectedId === cat.value ? "active" : ""}`}
										onClick={() => handleCatLevelChange(0, cat.value)}
										style={{ width: "calc(100% - 16px)", textAlign: "left" }}
									>
										<span>{cat.text}</span>
										{cat.isParent && <span className="art-sidebar-arrow">›</span>}
									</button>
								))}
							</div>
						</div>
					)}

					{/* ===== ZONE PRINCIPALE (TABLE) ===== */}
					<div className="art-card">
						{/* ---- BREADCRUMB HORIZONTAL (NIVEAUX 2+) ---- */}
						{catLevels.length > 1 && (
							<div className="art-cat-breadcrumb">
								{catLevels.slice(1).map((level, idx) => {
									const realIndex = idx + 1;
									return (
										<span key={realIndex} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
											<span className="art-cat-sep">/</span>
											<FormControl size="small" sx={{ width: 180 }}>
												<Select
													value={level.selectedId}
													onChange={(e) => handleCatLevelChange(realIndex, e.target.value as number)}
													displayEmpty
												>
													{level.items.map((c) => (
														<MenuItem key={c.value} value={c.value}>
															<span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%" }}>
																<span>{c.text}</span>
																{c.isParent && <span style={{ fontSize: 12, color: "#a0aec0", fontWeight: 300 }}>›</span>}
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

						{/* ---- TOOLBAR ---- */}
						<div className="art-toolbar">
							<Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
								<Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1a202c" }}>
									Liste des Articles
								</Typography>
								<FormControl size="small" sx={{ width: 70 }}>
									<Select
										value={filter.pageSize}
										onChange={(e) => setFilter({ pageSize: e.target.value as number, pageIndex: 1 })}
										displayEmpty
									>
										{[10, 20, 50, 100].map((n) => (
											<MenuItem key={n} value={n}>{n}</MenuItem>
										))}
									</Select>
								</FormControl>
								<TextField
									placeholder="Référence"
									size="small"
									sx={{ width: 120 }}
									value={colFilters["aR_Ref"] ?? ""}
									onChange={(e) => handleColFilter("aR_Ref", e.target.value)}
								/>
								<TextField
									placeholder="Désignation"
									size="small"
									sx={{ width: 160 }}
									value={colFilters["aR_Design"] ?? ""}
									onChange={(e) => handleColFilter("aR_Design", e.target.value)}
								/>
								<TextField
									placeholder="Famille"
									size="small"
									sx={{ width: 140 }}
									value={colFilters["fA_Intitule"] ?? ""}
									onChange={(e) => handleColFilter("fA_Intitule", e.target.value)}
								/>
							</Stack>
							<Stack direction="row" spacing={1}>
								<Button
									variant="contained"
									size="small"
									startIcon={<AddIcon />}
									onClick={onNew}
									sx={{ bgcolor: "#1a4f78", "&:hover": { bgcolor: "#163d5e" } }}
								>
									Nouveau
								</Button>
								<Button
									variant="outlined"
									size="small"
									startIcon={<EditIcon />}
									onClick={() => onEdit(selectedId)}
									disabled={!selectedId}
								>
									Modifier
								</Button>
								<Button
									variant="outlined"
									size="small"
									color="error"
									startIcon={<DeleteIcon />}
									onClick={handleDelete}
									disabled={!selectedId}
								>
									Supprimer
								</Button>
							</Stack>
						</div>

						{/* ---- DATA GRID ---- */}
						<Box sx={{ flex: 1, minHeight: 0 }}>
							<DataGrid
								rows={articles}
								columns={columns}
								loading={loading}
								rowCount={totalCount}
								paginationMode="server"
								getRowId={(row) => row.cbMarq}
								onRowClick={({ row }) => setSelectedId(row.cbMarq)}
								onRowDoubleClick={({ row }) => onEdit(row.cbMarq)}
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

			{/* Lightbox image */}
			{lightboxSrc && (
				<Box
					sx={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100vw",
						height: "100vh",
						bgcolor: "rgba(0,0,0,0.8)",
						zIndex: 9999,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
					}}
					onClick={() => setLightboxSrc(null)}
				>
					<img
						src={lightboxSrc}
						alt=""
						style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }}
					/>
				</Box>
			)}
		</>
	);
}
