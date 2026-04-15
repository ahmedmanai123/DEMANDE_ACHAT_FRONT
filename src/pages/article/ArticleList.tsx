// src/pages/article/ArticleList.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Image, Input, InputNumber, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useArticleStore } from "@/store/useArticleStore";
import type { IArticle, ICatalogue } from "@/types/article";

// ================================================================
// STYLES AMÉLIORÉS
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

  /* ---- ZONE PRINCIPALE ---- */
  .art-main {
    display: flex;
    gap: 12px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* ---- SIDEBAR (Design Moderne) ---- */
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
    
    /* Scrollbar fine et stylisée */
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
    padding-left: 10px; /* Compensation pour la bordure */
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

  /* ---- CARTE TABLE (Ombres et Coins Arrondis) ---- */
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

  /* ---- BREADCRUMB HORIZONTAL ---- */
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

  .art-cat-breadcrumb .ant-select {
    font-size: 13px;
  }
  .art-cat-breadcrumb .ant-select-selector {
    border-radius: 6px !important;
    border-color: #e2e8f0 !important;
    background: #fff !important;
    height: 32px !important;
    min-height: 32px !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    transition: all 0.2s;
  }
  .art-cat-breadcrumb .ant-select-selector:hover {
    border-color: #1a4f78 !important;
  }
  .art-cat-breadcrumb .ant-select-selection-item {
    line-height: 30px !important;
    font-size: 13px !important;
    color: #2d3748 !important;
    font-weight: 500;
  }

  /* ---- TOOLBAR ---- */
  .art-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    border-bottom: 1px solid #f0f2f5;
    background: #fff;
    flex-shrink: 0;
  }
  .art-toolbar-left { display: flex; align-items: center; gap: 12px; }
  .art-toolbar-title { 
    font-size: 15px; 
    font-weight: 700; 
    color: #1a202c; 
    letter-spacing: -0.2px;
  }
  .art-page-size-wrap { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
    font-size: 12px; 
    color: #718096; 
    background: #f7fafc;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid #edf2f7;
  }

  /* ---- TABLEAU DESIGN ---- */
  .art-table .ant-table-thead > tr > th {
    background: #c4d3df !important; /* Bleu élégant */
    color: #fff !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    padding: 12px 10px !important;
    border-right: 1px solid rgba(255,255,255,0.1) !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .art-table .ant-table-thead > tr > th::before { display: none !important; }

  .art-th { padding: 0 0 8px; }
  .art-th-label { 
    font-size: 11px; 
    font-weight: 600; 
    margin-bottom: 6px; 
    white-space: nowrap; 
    line-height: 1; 
    opacity: 0.9;
  }

  /* Inputs dans le header */
  .art-th-inp .ant-input-affix-wrapper,
  .art-th-inp .ant-input {
    background: rgba(255,255,255,0.15) !important;
    border: 1px solid rgba(255,255,255,0.3) !important;
    border-radius: 4px !important;
    color: #fff !important;
    font-size: 11px !important;
    height: 26px !important;
    min-height: 26px !important;
    box-shadow: none !important;
    width: 100% !important;
    transition: background 0.2s;
  }
  .art-th-inp .ant-input-affix-wrapper:hover,
  .art-th-inp .ant-input:hover,
  .art-th-inp .ant-input-affix-wrapper:focus,
  .art-th-inp .ant-input:focus,
  .art-th-inp .ant-input-focused {
    background: rgba(255,255,255,0.25) !important;
    border-color: #fff !important;
  }
  
  .art-th-inp .ant-input-affix-wrapper .ant-input {
    background: transparent !important;
    border: none !important;
    height: 20px !important;
    min-height: 20px !important;
  }
  .art-th-inp .ant-input-number {
    background: rgba(255,255,255,0.15) !important;
    border: 1px solid rgba(255,255,255,0.3) !important;
    border-radius: 4px !important;
    width: 100% !important;
    height: 26px !important;
    box-shadow: none !important;
  }
  .art-th-inp .ant-input-number-input {
    color: #fff !important;
    font-size: 11px !important;
    height: 24px !important;
    padding: 0 6px !important;
  }
  .art-th-inp .ant-input::placeholder,
  .art-th-inp .ant-input-number-input::placeholder { color: rgba(255,255,255,0.5) !important; }
  .art-th-inp .anticon { color: rgba(255,255,255,0.7) !important; }
  .art-th-inp .ant-input-clear-icon { color: rgba(255,255,255,0.7) !important; }

  /* Lignes du tableau */
  .art-table .ant-table-tbody > tr > td {
    padding: 8px 10px !important;
    font-size: 13px !important;
    border-bottom: 1px solid #f7fafc !important;
    color: #4a5568;
  }
  .art-table .ant-table-tbody > tr:nth-child(even) > td { background: #fcfcfc !important; }
  .art-table .ant-table-tbody > tr:hover > td { background: #f0f9ff !important; }
  
  /* Ligne sélectionnée */
  .art-row-sel > td {
    background: #e6f7ff !important;
    color: #1a4f78 !important;
    font-weight: 500;
    border-bottom: 1px solid #bae7ff !important;
  }

  /* Pagination */
  .art-table .ant-pagination {
    padding: 10px 18px !important;
    margin: 0 !important;
    border-top: 1px solid #f0f2f5 !important;
    background: #fff !important;
  }
  .art-table .ant-pagination-item-active {
    border-color: #1a4f78;
  }
  .art-table .ant-pagination-item-active a {
    color: #1a4f78;
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
// COMPOSANT TH (En-tête avec filtre)
// ================================================================
function Th({
	label,
	field,
	type = "text",
	value,
	onChange,
}: {
	label: string;
	field: string;
	type?: "text" | "number";
	value: string;
	onChange: (f: string, v: string) => void;
}) {
	return (
		<div className="art-th">
			<div className="art-th-label">{label}</div>
			<div className="art-th-inp">
				{type === "number" ? (
					<InputNumber
						size="small"
						value={value ? Number(value) : undefined}
						onChange={(v) => onChange(field, v != null ? String(v) : "")}
						placeholder="..."
						controls={false}
					/>
				) : (
					<Input
						size="small"
						value={value}
						onChange={(e) => onChange(field, e.target.value)}
						placeholder="Filtrer..."
						prefix={<SearchOutlined />}
						allowClear
					/>
				)}
			</div>
		</div>
	);
}

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
	const selectedRow = useRef<IArticle | null>(null);
	const [, forceRender] = useState(0);

	// ---- Catalogue state ----
	const [catLevels, setCatLevels] = useState<CatLevel[]>([]);
	const [catLoading, setCatLoading] = useState(false);

	useEffect(() => {
		fetchDepots();
		fetchArticles();
	}, []); // eslint-disable-line
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

	const depotCols = useMemo<ColumnsType<IArticle>>(
		() =>
			depots.map((d) => ({
				key: `DE_${d.dE_No}`,
				dataIndex: `DE_${d.dE_No}`,
				width: 130,
				align: "right" as const,
				title: (
					<Th
						label={d.dE_Intitule}
						field={`DE_${d.dE_No}`}
						type="number"
						value={colFilters[`DE_${d.dE_No}`] ?? ""}
						onChange={handleColFilter}
					/>
				),
				render: (_: unknown, row: IArticle) => {
					const v = (row as Record<string, unknown>)[`DE_${d.dE_No}`];
					const n = typeof v === "number" ? v : 0;
					return <span style={{ color: n > 0 ? "#2b6cb0" : "#a0aec0", fontWeight: n > 0 ? 600 : 400 }}>{n}</span>;
				},
			})),
		[depots, colFilters],
	);

	const cols = useMemo<ColumnsType<IArticle>>(
		() => [
			{
				key: "aR_Ref",
				dataIndex: "aR_Ref",
				width: 130,
				sorter: true,
				title: <Th label="Référence" field="aR_Ref" value={colFilters["aR_Ref"] ?? ""} onChange={handleColFilter} />,
				render: (v: string, row: IArticle) => (
					<span className="art-ref" onClick={() => onEdit(row.cbMarq)}>
						{v}
					</span>
				),
			},
			{
				key: "aR_Design",
				dataIndex: "aR_Design",
				width: 220,
				title: (
					<Th label="Désignation" field="aR_Design" value={colFilters["aR_Design"] ?? ""} onChange={handleColFilter} />
				),
			},
			{
				key: "fA_Intitule",
				dataIndex: "fA_Intitule",
				width: 160,
				title: (
					<Th label="Famille" field="fA_Intitule" value={colFilters["fA_Intitule"] ?? ""} onChange={handleColFilter} />
				),
			},
			{
				key: "aR_PrixAch",
				dataIndex: "aR_PrixAch",
				width: 110,
				align: "right" as const,
				sorter: true,
				title: (
					<Th
						label="Prix Achat"
						field="aR_PrixAch"
						type="number"
						value={colFilters["aR_PrixAch"] ?? ""}
						onChange={handleColFilter}
					/>
				),
				render: (v: number) => (v ? <span style={{ fontWeight: 500, color: "#2d3748" }}>{v.toFixed(3)}</span> : ""),
			},
			...depotCols,
			{
				key: "totalStock",
				dataIndex: "totalStock",
				width: 110,
				align: "right" as const,
				sorter: true,
				title: (
					<div className="art-th">
						<div className="art-th-label">Total Stock</div>
					</div>
				),
				render: (v: number) => (
					<Tag
						color={v > 0 ? "#3182ce" : "#cbd5e0"}
						style={{
							minWidth: 40,
							textAlign: "center",
							fontSize: 11,
							fontWeight: 600,
							borderRadius: 4,
							border: "none",
						}}
					>
						{v ?? 0}
					</Tag>
				),
			},
			{
				key: "aR_Photo",
				dataIndex: "aR_Photo",
				width: 60,
				align: "center" as const,
				title: (
					<div className="art-th">
						<div className="art-th-label">Photo</div>
					</div>
				),
				render: (v: string) =>
					v ? (
						<img
							src={v}
							alt=""
							style={{
								width: 32,
								height: 32,
								objectFit: "cover",
								borderRadius: 6,
								cursor: "pointer",
								boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
							}}
							onClick={(e) => {
								e.stopPropagation();
								setLightboxSrc(v);
							}}
						/>
					) : null,
			},
		],
		[depotCols, colFilters, onEdit],
	);

	const handleDelete = () => {
		if (!selectedId) return;
		Modal.confirm({
			title: "Confirmer la suppression",
			content: "Voulez-vous vraiment supprimer cet article ?",
			okText: "Supprimer",
			okType: "danger",
			cancelText: "Annuler",
			onOk: () => deleteArticle(selectedId),
		});
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
									<div
										key={cat.value}
										className={`art-sidebar-item ${catLevels[0].selectedId === cat.value ? "active" : ""}`}
										onClick={() => handleCatLevelChange(0, cat.value)}
									>
										<span>{cat.text}</span>
										{cat.isParent && <span className="art-sidebar-arrow">›</span>}
									</div>
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
											<Select
												size="small"
												value={level.selectedId}
												onChange={(v) => handleCatLevelChange(realIndex, v)}
												options={level.items.map((c) => ({
													value: c.value,
													label: (
														<span
															style={{
																display: "inline-flex",
																alignItems: "center",
																justifyContent: "space-between",
																gap: 12,
																width: "100%",
															}}
														>
															<span>{c.text}</span>
															{c.isParent && <span style={{ fontSize: 12, color: "#a0aec0", fontWeight: 300 }}>›</span>}
														</span>
													),
												}))}
												style={{ width: 180 }}
												loading={catLoading && realIndex === catLevels.length - 1}
												popupMatchSelectWidth={false}
												showSearch
												optionFilterProp="label"
												allowClear={false}
											/>
										</span>
									);
								})}
							</div>
						)}

						{/* ---- TOOLBAR ---- */}
						<div className="art-toolbar">
							<div className="art-toolbar-left">
								<span className="art-toolbar-title">Liste des Articles</span>
								<div className="art-page-size-wrap">
									<span>Afficher :</span>
									<Select
										size="small"
										value={filter.pageSize}
										onChange={(v) => setFilter({ pageSize: v, pageIndex: 1 })}
										options={[10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }))}
										style={{ width: 70, minWidth: 70 }}
										bordered={false}
									/>
								</div>
							</div>
							<Space size="small">
								<Button
									size="small"
									type="primary"
									icon={<PlusOutlined />}
									onClick={onNew}
									style={{
										background: "#1a4f78",
										borderColor: "#1a4f78",
										fontWeight: 600,
										borderRadius: 6,
										boxShadow: "0 2px 4px rgba(26,79,120,0.3)",
									}}
								>
									Nouveau
								</Button>
								<Button
									size="small"
									icon={<EditOutlined />}
									onClick={() => onEdit(selectedId)}
									disabled={!selectedId}
									style={{
										borderRadius: 6,
										color: selectedId ? "#1a4f78" : "#cbd5e0",
										borderColor: selectedId ? "#1a4f78" : "#e2e8f0",
									}}
								>
									Modifier
								</Button>
								<Button
									size="small"
									danger
									icon={<DeleteOutlined />}
									onClick={handleDelete}
									disabled={!selectedId}
									style={{ borderRadius: 6 }}
								>
									Supprimer
								</Button>
							</Space>
						</div>

						{/* ---- TABLEAU ---- */}
						<Table<IArticle>
							className="art-table"
							dataSource={articles}
							columns={cols}
							loading={loading}
							rowKey={(r) => r.cbMarq}
							size="small"
							scroll={{ x: "max-content", y: "calc(100vh - 230px)" }}
							rowClassName={(r) => (selectedRow.current?.cbMarq === r.cbMarq ? "art-row-sel" : "")}
							onRow={(r) => ({
								onClick: () => {
									selectedRow.current = r;
									setSelectedId(r.cbMarq);
									forceRender((n) => n + 1);
								},
								onDoubleClick: () => onEdit(r.cbMarq),
								style: { cursor: "pointer" },
							})}
							pagination={{
								current: filter.pageIndex,
								pageSize: filter.pageSize,
								total: totalCount,
								showSizeChanger: false,
								size: "small",
								showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total}`,
								onChange: (page) => setFilter({ pageIndex: page }),
							}}
						/>
					</div>
				</div>
			</div>

			{/* Lightbox image */}
			<Image
				style={{ display: "none" }}
				preview={{
					visible: !!lightboxSrc,
					src: lightboxSrc ?? "",
					onVisibleChange: (v) => {
						if (!v) setLightboxSrc(null);
					},
				}}
			/>
		</>
	);
}
