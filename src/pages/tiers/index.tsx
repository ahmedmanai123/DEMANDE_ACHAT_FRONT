import { Button, Space, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import ProDataGrid, { type ColumnFilterConfig } from "@/layouts/components/pro-data-grid/ProDataGrid";

// ─── Type ──────────────────────────────────────────────────────────────────────
interface Tiers {
	CT_Num: string;
	CT_Intitule: string;
	CT_Type: number;
	CT_Ville: string;
	CT_Telephone: string;
	CT_EMail: string;
	CT_Sommeil: number;
}

// ─── Fausses données ───────────────────────────────────────────────────────────
const VILLES = ["Tunis", "Sfax", "Sousse", "Bizerte", "Nabeul"];
const FAKE_TIERS: Tiers[] = Array.from({ length: 87 }, (_, i) => ({
	CT_Num: `CPT${String(i + 1).padStart(5, "0")}`,
	CT_Intitule: `Société ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
	CT_Type: i % 3,
	CT_Ville: VILLES[i % 5],
	CT_Telephone: `+216 ${String(Math.floor(10000000 + Math.abs(Math.sin(i) * 90000000))).slice(0, 8)}`,
	CT_EMail: `contact${i + 1}@societe${i + 1}.tn`,
	CT_Sommeil: i % 7 === 0 ? 1 : 0,
}));

// ─── Colonnes ─────────────────────────────────────────────────────────────────
const columns: ColumnsType<Tiers> = [
	{
		title: "N° Compte",
		dataIndex: "CT_Num",
		key: "CT_Num",
		sorter: true,
		width: 130,
		fixed: "left",
		render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code>,
	},
	{
		title: "Intitulé",
		dataIndex: "CT_Intitule",
		key: "CT_Intitule",
		sorter: true,
		width: 200,
		render: (v: string) => (
			<Tooltip title={v}>
				<span style={{ fontWeight: 500 }}>{v}</span>
			</Tooltip>
		),
	},
	{
		title: "Type",
		dataIndex: "CT_Type",
		key: "CT_Type",
		width: 130,
		render: (v: number) => (
			<Tag color={v === 0 ? "blue" : v === 1 ? "green" : "orange"}>
				{v === 0 ? "Client" : v === 1 ? "Fournisseur" : "Autre"}
			</Tag>
		),
	},
	{
		title: "Ville",
		dataIndex: "CT_Ville",
		key: "CT_Ville",
		sorter: true,
		width: 130,
	},
	{
		title: "Téléphone",
		dataIndex: "CT_Telephone",
		key: "CT_Telephone",
		width: 140,
	},
	{
		title: "Email",
		dataIndex: "CT_EMail",
		key: "CT_EMail",
		width: 220,
		ellipsis: true,
	},
	{
		title: "Statut",
		dataIndex: "CT_Sommeil",
		key: "CT_Sommeil",
		width: 100,
		render: (v: number) => <Tag color={v === 1 ? "red" : "success"}>{v === 1 ? "Inactif" : "Actif"}</Tag>,
	},
	{
		title: "Actions",
		key: "actions",
		fixed: "right",
		width: 110,
		render: () => (
			<Space>
				<Button type="link" size="small">
					Voir
				</Button>
				<Button type="link" size="small" danger>
					Suppr.
				</Button>
			</Space>
		),
	},
];

// ─── Config filtres par colonne ────────────────────────────────────────────────
const columnFilters: ColumnFilterConfig<Tiers>[] = [
	{ key: "CT_Num", type: "text", placeholder: "ex: CPT001" },
	{ key: "CT_Intitule", type: "text", placeholder: "Nom société..." },
	{
		key: "CT_Type",
		type: "select",
		placeholder: "Tous",
		options: [
			{ label: "Client", value: 0 },
			{ label: "Fournisseur", value: 1 },
			{ label: "Autre", value: 2 },
		],
	},
	{
		key: "CT_Ville",
		type: "select",
		placeholder: "Toutes",
		options: VILLES.map((v) => ({ label: v, value: v })),
	},
	{ key: "CT_Telephone", type: "text", placeholder: "Rechercher..." },
	{ key: "CT_EMail", type: "text", placeholder: "Rechercher..." },
	{
		key: "CT_Sommeil",
		type: "select",
		placeholder: "Tous",
		options: [
			{ label: "Actif", value: 0 },
			{ label: "Inactif", value: 1 },
		],
	},
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function TiersPage() {
	const [filterValues, setFilterValues] = useState<Partial<Record<keyof Tiers, string | number>>>({});

	// Filtrage local — remplacer par appel API plus tard
	const filtered = useMemo(() => {
		return FAKE_TIERS.filter((row) => {
			const { CT_Num, CT_Intitule, CT_Type, CT_Ville, CT_Telephone, CT_EMail, CT_Sommeil } = filterValues;
			return (
				(!CT_Num || row.CT_Num.toLowerCase().includes(String(CT_Num).toLowerCase())) &&
				(!CT_Intitule || row.CT_Intitule.toLowerCase().includes(String(CT_Intitule).toLowerCase())) &&
				(CT_Type === undefined || row.CT_Type === Number(CT_Type)) &&
				(!CT_Ville || row.CT_Ville === CT_Ville) &&
				(!CT_Telephone || row.CT_Telephone.includes(String(CT_Telephone))) &&
				(!CT_EMail || row.CT_EMail.toLowerCase().includes(String(CT_EMail).toLowerCase())) &&
				(CT_Sommeil === undefined || row.CT_Sommeil === Number(CT_Sommeil))
			);
		});
	}, [filterValues]);

	const handleFilterChange = (key: keyof Tiers, value: string | number | undefined) => {
		setFilterValues((prev) => ({ ...prev, [key]: value }));
	};

	const stats = [
		{ label: "Total", value: filtered.length },
		{ label: "Clients", value: filtered.filter((r) => r.CT_Type === 0).length, color: "#1677ff" },
		{ label: "Fournisseurs", value: filtered.filter((r) => r.CT_Type === 1).length, color: "#52c41a" },
		{ label: "Inactifs", value: filtered.filter((r) => r.CT_Sommeil === 1).length, color: "#ff4d4f" },
	];

	return (
		<ProDataGrid<Tiers>
			title="Gestion des Tiers"
			subtitle={`${filtered.length} tiers trouvés`}
			columns={columns}
			dataSource={filtered}
			totalCount={filtered.length}
			rowKey="CT_Num"
			columnFilters={columnFilters}
			filterValues={filterValues}
			onFilterChange={handleFilterChange}
			onClearFilters={() => setFilterValues({})}
			stats={stats}
			scrollX={1300}
			onExport={() => console.log("Export...")}
		/>
	);
}
