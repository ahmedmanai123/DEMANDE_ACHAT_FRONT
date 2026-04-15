// ============================================================
// pages/DemandeBesoin/DemandeBesoin.page.tsx
// Remplace : Demandes_Besoin.cshtml
// Emplacement Slash Admin : src/pages/besoin/DemandeBesoin.page.tsx
// Route : /besoin/demandes
// ============================================================

import React, { useState } from "react";
import { Table, Button, DatePicker, Select, Input, Breadcrumb } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { FilterValue, SorterResult } from "antd/es/table/interface";
import { HomeOutlined, PlusOutlined, ExportOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useBesoinList } from "../../hooks/useBesoin";
import { ETAT_BESOIN_LABELS, getEtatBesoinBadge, formatDateTime, getCurrentWeekRange } from "../../utils/besoin.utils";
import { Etat_Besoin } from "../../types/besoin.types";
import type { DA_BESOINDto } from "../../types/besoin.types";

// ── Permissions (Remplace AuthorizationService.HavePermission) ─
// Adapter selon votre système auth (JWT claims, context, etc.)
import { usePermissions } from "../../hooks/usePermissions";
import { useNavigate } from "react-router";

const { RangePicker } = DatePicker;
const { Option } = Select;

// ──────────────────────────────────────────────────────────────

const DemandeBesoinPage: React.FC = () => {
	const navigate = useNavigate();
	const { can } = usePermissions(); // votre hook de permissions
	const [selectedRowKey, setSelectedRowKey] = useState<number | null>(null);

	const { data, total, loading, filter, updateFilter, changePage, exportExcel } = useBesoinList();

	// ── Période initiale (semaine en cours, comme GetDatePeriodeSemaine) ─
	const { start, end } = getCurrentWeekRange();
	const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs(start), dayjs(end)]);

	// ── Colonnes du tableau (remplace jsGrid fields) ─────────────
	const columns: ColumnsType<DA_BESOINDto> = [
		{
			title: "N° Besoin",
			dataIndex: "B_Numero",
			sorter: true,
			width: 130,
			// Remplace : filterTemplate de jsGrid
			filterDropdown: ({ confirm }) => (
				<div className="p-2">
					<Input
						placeholder="Numéro..."
						onChange={(e) => updateFilter({ B_Numero: e.target.value })}
						onPressEnter={() => confirm()}
					/>
				</div>
			),
		},
		{
			title: "Titre",
			dataIndex: "B_Titre",
			sorter: true,
			filterDropdown: ({ confirm }) => (
				<div className="p-2">
					<Input
						placeholder="Titre..."
						onChange={(e) => updateFilter({ B_Titre: e.target.value })}
						onPressEnter={() => confirm()}
					/>
				</div>
			),
		},
		{
			title: "Date",
			dataIndex: "B_Date",
			sorter: true,
			width: 140,
			render: (v) => formatDateTime(v),
			filterDropdown: ({ confirm }) => (
				<div className="p-2">
					<DatePicker
						format="DD-MM-YYYY"
						onChange={(d) => {
							updateFilter({ B_Date: d?.toISOString() });
							confirm();
						}}
					/>
				</div>
			),
		},
		{
			title: "Demandeur",
			dataIndex: "B_Demandeur",
			sorter: true,
			filterDropdown: ({ confirm }) => (
				<div className="p-2">
					<Input
						placeholder="Demandeur..."
						onChange={(e) => updateFilter({ B_Demandeur: e.target.value })}
						onPressEnter={() => confirm()}
					/>
				</div>
			),
		},
		{
			title: "Affaire",
			dataIndex: "CA_Intitule",
			sorter: true,
			filterDropdown: ({ confirm }) => (
				<div className="p-2">
					<Input
						placeholder="Affaire..."
						onChange={(e) => updateFilter({ CA_Intitule: e.target.value })}
						onPressEnter={() => confirm()}
					/>
				</div>
			),
		},
		{
			title: "Dépôt",
			dataIndex: "DE_Intitule",
			sorter: true,
			filterDropdown: ({ confirm }) => (
				<div className="p-2">
					<Input
						placeholder="Dépôt..."
						onChange={(e) => updateFilter({ DE_Intitule: e.target.value })}
						onPressEnter={() => confirm()}
					/>
				</div>
			),
		},
		{
			title: "État",
			dataIndex: "B_Etat_Besoin",
			width: 200,
			// Remplace : EtatValidationField filterTemplate + itemTemplate
			filterDropdown: ({ confirm }) => (
				<div className="p-2">
					<Select
						style={{ width: 220 }}
						defaultValue={-1}
						onChange={(v) => {
							updateFilter({ B_Etat_Besoin: v as Etat_Besoin });
							confirm();
						}}
					>
						{Object.entries(ETAT_BESOIN_LABELS).map(([k, v]) => (
							<Option key={k} value={Number(k)}>
								{v}
							</Option>
						))}
					</Select>
				</div>
			),
			render: (etat: Etat_Besoin) => {
				const badge = getEtatBesoinBadge(etat);
				return (
					<span
						className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}
					>
						<i className={`fas ${badge.icon} text-xs`} />
						{ETAT_BESOIN_LABELS[etat] ?? etat}
					</span>
				);
			},
		},
	];

	// ── Gestion tri + pagination Ant Design ──────────────────────
	const handleTableChange = (
		pagination: TablePaginationConfig,
		_filters: Record<string, FilterValue | null>,
		sorter: SorterResult<DA_BESOINDto> | SorterResult<DA_BESOINDto>[],
	) => {
		const s = Array.isArray(sorter) ? sorter[0] : sorter;
		changePage(pagination.current ?? 1, pagination.pageSize ?? 10);
		if (s.field) {
			updateFilter({
				sortField: s.field as string,
				sortOrder: s.order === "ascend" ? "asc" : "desc",
			});
		}
	};

	return (
		// ── Layout Slash Admin : wrapper page ────────────────────
		<div className="page-wrapper">
			{/* Breadcrumb — remplace @Html.ActionLink / ol.breadcrumb Razor */}
			<div className="page-breadcrumb">
				<Breadcrumb
					items={[
						{
							href: "/",
							title: (
								<>
									<HomeOutlined /> Accueil
								</>
							),
						},
						{ title: <strong>Demandes de besoins</strong> },
					]}
				/>
			</div>

			<div className="page-content container-fluid">
				<div className="card">
					<div className="card-body">
						{/* ── Barre d'outils ── */}
						<div className="flex flex-wrap items-center gap-2 mb-4">
							{/* Sélecteur période — remplace daterangepicker jQuery */}
							<RangePicker
								format="DD-MM-YYYY"
								value={dateRange}
								onChange={(dates) => {
									if (!dates || !dates[0] || !dates[1]) return;
									setDateRange([dates[0], dates[1]]);
									updateFilter({
										dateDebut: dates[0].startOf("day").toISOString(),
										dateFin: dates[1].endOf("day").toISOString(),
									});
								}}
							/>

							{/* Bouton Nouveau — conditionnel comme @if (HavePermission(Creer)) */}
							{can("Demande_Besoin", "Creer") && (
								<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/besoin/nouveau")}>
									Nouveau
								</Button>
							)}

							{/* Bouton Détails */}
							{can("Demande_Besoin", "Consulter") && (
								<Button
									icon={<EyeOutlined />}
									disabled={!selectedRowKey}
									onClick={() => {
										if (selectedRowKey) navigate(`/besoin/details/${selectedRowKey}`);
									}}
								>
									Détails
								</Button>
							)}

							{/* Bouton Export Excel */}
							{can("Demande_Besoin", "Export_Excel") && (
								<Button icon={<ExportOutlined />} onClick={exportExcel}>
									Exporter
								</Button>
							)}
						</div>

						{/* ── Tableau principal — remplace jsGrid ── */}
						<Table<DA_BESOINDto>
							rowKey="B_No"
							dataSource={data}
							columns={columns}
							loading={loading}
							size="small"
							scroll={{ x: 900 }}
							rowClassName={(record) => (record.B_No === selectedRowKey ? "selected-row" : "")}
							onRow={(record) => ({
								onClick: () => setSelectedRowKey(record.B_No),
								onDoubleClick: () => navigate(`/besoin/details/${record.B_No}`),
							})}
							pagination={{
								current: filter.pageIndex,
								pageSize: filter.pageSize,
								total,
								showSizeChanger: true,
								pageSizeOptions: ["5", "10", "20", "50"],
								showTotal: (tot) => `Total : ${tot} enregistrement(s)`,
							}}
							onChange={handleTableChange}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DemandeBesoinPage;
