import { EyeOutlined, FileExcelOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, DatePicker, Select, Space, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ProDataGrid, { type AntColDef } from "@/pages/article/ProDataGrid";
import {
	exportDemandesAAcheterExcel,
	getDemandesAAcheter,
	getInfoTypeBesoin,
} from "@/services/besoinservice";
import { Etat_Affectation_Acheteur, Type_Validation, TypeSage, type DA_BESOIN_AACHETERDto } from "@/types/besoin";

type Props = {
	onOpenDetail: (bNo: number, tpNo: number) => void;
};

const { RangePicker } = DatePicker;

const asRecord = (v: unknown): Record<string, unknown> =>
	v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const asNumber = (v: unknown): number => {
	if (typeof v === "number") return v;
	const n = Number(v);
	return Number.isNaN(n) ? 0 : n;
};
const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const affectationStateUi: Record<number, { label: string; width: number; color: string }> = {
	[Etat_Affectation_Acheteur.Brouillon]: { label: "Brouillon", width: 10, color: "#6c757d" },
	[Etat_Affectation_Acheteur.Encours]: { label: "En cours", width: 20, color: "#fd7e14" },
	[Etat_Affectation_Acheteur.Generer_Demande]: { label: "Générer demande", width: 40, color: "#0d6efd" },
	[Etat_Affectation_Acheteur.Acheter]: { label: "Achetée", width: 70, color: "#198754" },
	[Etat_Affectation_Acheteur.Valider]: { label: "Validée", width: 95, color: "#198754" },
};

export default function BesoinGestionDemandesPage({ onOpenDetail }: Props) {
	const [rows, setRows] = useState<DA_BESOIN_AACHETERDto[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [selectedId, setSelectedId] = useState<number>(0);
	const [selected, setSelected] = useState<Record<string, unknown>>({});
	const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("isoWeek"), dayjs().endOf("isoWeek")]);
	const [filter, setFilter] = useState({
		pageIndex: 1,
		pageSize: 10,
		B_Etat_Affectation_Acheteur: -1,
		B_TypeDocument: 0,
		AD_TypeDemande: 0,
		dateDebut: dayjs().startOf("isoWeek").format("YYYY-MM-DD"),
		dateFin: dayjs().endOf("isoWeek").format("YYYY-MM-DD"),
	});
	const [champsLibreKeys, setChampsLibreKeys] = useState<string[]>([]);

	const loadData = async (): Promise<void> => {
		setLoading(true);
		try {
			const res = await getDemandesAAcheter(filter);
			console.log("📥 Réponse du backend getDemandesAAcheter:", res);
			console.log("📥 res.data (premier élément):", res.data?.[0]);
			
			setRows(Array.isArray(res.data) ? res.data : []);
			setTotal(res.itemsCount || 0);
			const meta = asRecord((res as unknown as Record<string, unknown>).ChampsLibres ?? (res as unknown as Record<string, unknown>).champsLibres);
			if (Object.keys(meta).length) setChampsLibreKeys(Object.keys(meta));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Erreur chargement demandes.");
		} finally {
			setLoading(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		void loadData();
	}, [filter.pageIndex, filter.pageSize, filter.B_Etat_Affectation_Acheteur, filter.B_TypeDocument, filter.AD_TypeDemande, filter.dateDebut, filter.dateFin]);

	const openAffectation = async (item: Record<string, unknown>): Promise<void> => {
		console.group("🔴 ULTRA DEBUG - openAffectation");
		console.log("════════════════════════════════════════");
		
		// ✅ 1. Inspecter complètement l'objet
		console.log("📦 Objet item complet:", item);
		console.log("📋 Toutes les clés de item:", Object.keys(item));
		
		// ✅ 2. Tester toutes les variantes de casing
		console.group("🔍 Cherchant l'ID dans différentes formes:");
		console.log("  item.B_No =", item.B_No);
		console.log("  item.b_No =", item.b_No);
		console.log("  item.B_No (avec capital N) =", (item as any)["B_No"]);
		console.log("  item['B_No'] =", item["B_No"]);
		console.log("  item['b_No'] =", item["b_No"]);
		console.log("  Toutes les propriétés contenant 'No':", 
			Object.entries(item).filter(([k]) => k.toLowerCase().includes('no')));
		console.groupEnd();

		// ✅ 3. Tester toutes les variantes de typeDocument
		console.group("🔍 Cherchant typeDocument:");
		console.log("  item.B_TypeDocument =", item.B_TypeDocument);
		console.log("  item.b_TypeDocument =", item.b_TypeDocument);
		console.log("  item.TP_No =", item.TP_No);
		console.log("  item.tp_No =", item.tp_No);
		console.log("  item.B_Type =", item.B_Type);
		console.log("  Toutes les propriétés contenant 'Type':", 
			Object.entries(item).filter(([k]) => k.toLowerCase().includes('type')));
		console.groupEnd();

		// ✅ 4. Essayer de trouver automatiquement l'ID
		const possibleIdKeys = Object.keys(item).filter(k => 
			k.toLowerCase().includes('no') || 
			k.toLowerCase().includes('id') ||
			k === 'B_No' ||
			k === 'b_No'
		);
		console.log("🎯 Clés potentielles pour l'ID:", possibleIdKeys);
		
		// ✅ 5. Essayer avec toutes les clés trouvées
		let bNoFound = 0;
		for (const key of possibleIdKeys) {
			const val = asNumber(item[key]);
			if (val > 0) {
				console.log(`✅ ID trouvé! ${key} = ${val}`);
				bNoFound = val;
				break;
			}
		}

		// ✅ 6. Parsing final
		const bNo = bNoFound || asNumber(item.B_No ?? item.b_No ?? item.B_No);
		const typeDocument = asNumber(item.B_TypeDocument ?? item.b_TypeDocument ?? item.TP_No ?? item.tp_No) || TypeSage.Demande_Achat;

		console.log("════════════════════════════════════════");
		console.log("📊 RÉSULTATS FINAUX:");
		console.log(`  bNo = ${bNo}`);
		console.log(`  typeDocument = ${typeDocument}`);
		console.log(`  bNo valide? ${bNo && bNo > 0 ? "✅ OUI" : "❌ NON"}`);
		console.groupEnd();

		if (!bNo || bNo <= 0) {
			console.error("❌ ERREUR CRITIQUE: Impossible de trouver l'ID du besoin");
			toast.error("❌ ID besoin invalide - Voir console pour les détails");
			return;
		}

		const newUrl = `?mode=affectation&id=${bNo}&type=${typeDocument}`;
		console.log("📍 Redirection vers:", newUrl);
		
		onOpenDetail(bNo, typeDocument);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const columns = useMemo((): AntColDef<DA_BESOIN_AACHETERDto>[] => {
		const base: AntColDef<DA_BESOIN_AACHETERDto>[] = [
			{
				field: "B_Numero",
				headerName: "Numéro",
				width: 100,
				renderCell: ({ row }) => {
					const r = asRecord(row);
					return (
						<button
							type="button"
							className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-[#e2552d] underline"
							onClick={(e) => {
								e.preventDefault();
								void openAffectation(r);
							}}
						>
							{asString(r.B_Numero)}
						</button>
					);
				},
			},
			{ field: "B_Titre", headerName: "Titre", width: 160 },
			{ field: "B_Demandeur", headerName: "Demandeur", width: 140 },
			{ field: "CA_Intitule", headerName: "Affaire", width: 140 },
			{ field: "DE_Intitule", headerName: "Dépôt", width: 120 },
			{
				field: "B_Etat_Affectation_Acheteur",
				headerName: "État",
				width: 160,
				renderCell: ({ value }) => {
					const etat = asNumber(value);
					const ui = affectationStateUi[etat];
					if (!ui) return <span>{etat}</span>;
					return (
						<div className="min-w-[120px]">
							<div className="text-xs font-semibold">{ui.label}</div>
							<div className="mt-0.5 h-1 overflow-hidden rounded-sm bg-[#e1e1e1]">
								<div className="h-full transition-[width] duration-500" style={{ width: `${ui.width}%`, backgroundColor: ui.color }} />
							</div>
						</div>
					);
				},
			},
			{
				field: "B_TypeDocument",
				headerName: "Type document",
				width: 130,
				renderCell: ({ value }) => (asNumber(value) === TypeSage.BC_Achat ? "Bon de commande" : "Demande de prix"),
			},
			{
				field: "AD_TypeDemande",
				headerName: "Type demande",
				width: 140,
				renderCell: ({ value }) =>
					asNumber(value) === Type_Validation.Retour_Demande_Validation ? "Retour demande" : "Demande besoin",
			},
		];

		const dynCols: AntColDef<DA_BESOIN_AACHETERDto>[] = champsLibreKeys.map((key) => ({
			key: `cl_${key}`,
			headerName: key,
			width: 120,
			renderCell: ({ row }) => {
				const bag = asRecord(asRecord(row).ChampsLibres ?? asRecord(row).champsLibres);
				return asString(bag[key]);
			},
		}));

		base.push({
			key: "actions",
			headerName: " ",
			width: 60,
			renderCell: ({ row }) => (
				<Button
					type="text"
					icon={<EyeOutlined />}
					onClick={(e) => {
						e.stopPropagation();
						void openAffectation(asRecord(row));
					}}
				/>
			),
		});

		return [...base.slice(0, base.length - 1), ...dynCols, base[base.length - 1]];
	}, [champsLibreKeys]);

	return (
		<div className="mx-auto max-w-[1450px] space-y-4 px-4 py-4">
			<div className="flex items-center justify-between">
				<Typography.Title level={4} style={{ margin: 0 }}>
					Gestion des demandes
				</Typography.Title>
				<Space>
					<Button
						onClick={() => {
							if (!selectedId) {
								toast.error("Aucune ligne sélectionnée");
								return;
							}
							void openAffectation(selected);
						}}
					>
						Détails
					</Button>
					<Button
						icon={<FileExcelOutlined />}
						onClick={async () => {
							try {
								const response = await exportDemandesAAcheterExcel(filter);
								const fileName =
									(response.headers["file-name"] as string | undefined) ||
									`Liste_Demandes_AAcheter_${new Date().toISOString().slice(0, 10)}.xlsx`;
								const url = URL.createObjectURL(response.data);
								const a = document.createElement("a");
								a.href = url;
								a.download = fileName;
								a.click();
								URL.revokeObjectURL(url);
							} catch {
								toast.error("Erreur export.");
							}
						}}
					>
						Exporter
					</Button>
				</Space>
			</div>

			<Space wrap>
				<Select
					value={filter.pageSize}
					style={{ width: 90 }}
					options={[10, 20, 50, 100].map((v) => ({ value: v, label: v }))}
					onChange={(v) => setFilter((p) => ({ ...p, pageSize: Number(v), pageIndex: 1 }))}
				/>
				<RangePicker
					value={range}
					format="DD-MM-YYYY"
					onChange={(dates) => {
						if (!dates || !dates[0] || !dates[1]) return;
						
						const startDate = dates[0];
						const endDate = dates[1];
						
						setRange([startDate, endDate]);
						setFilter((p) => ({
							...p,
							dateDebut: startDate.format("YYYY-MM-DD"),
							dateFin: endDate.format("YYYY-MM-DD"),
							pageIndex: 1,
						}));
					}}
				/>
				<Select
					value={filter.B_Etat_Affectation_Acheteur}
					style={{ width: 170 }}
					options={[
						{ value: -1, label: "Tous états" },
						{ value: 0, label: "Brouillon" },
						{ value: 1, label: "En cours" },
						{ value: 2, label: "Générer demande" },
						{ value: 3, label: "Achetée" },
						{ value: 4, label: "Validée" },
					]}
					onChange={(v) => setFilter((p) => ({ ...p, B_Etat_Affectation_Acheteur: Number(v), pageIndex: 1 }))}
				/>
				<Select
					value={filter.B_TypeDocument}
					style={{ width: 170 }}
					options={[
						{ value: 0, label: "Tous documents" },
						{ value: TypeSage.Demande_Achat, label: "Demande de prix" },
						{ value: TypeSage.BC_Achat, label: "Bon de commande" },
					]}
					onChange={(v) => setFilter((p) => ({ ...p, B_TypeDocument: Number(v), pageIndex: 1 }))}
				/>
				<Select
					value={filter.AD_TypeDemande}
					style={{ width: 190 }}
					options={[
						{ value: Type_Validation.Demande_Besoin, label: "Demande besoin" },
						{ value: Type_Validation.Retour_Demande_Validation, label: "Retour demande" },
					]}
					onChange={(v) => setFilter((p) => ({ ...p, AD_TypeDemande: Number(v), pageIndex: 1 }))}
				/>
				<Button icon={<ReloadOutlined />} onClick={() => void loadData()}>
					Actualiser
				</Button>
			</Space>

			<ProDataGrid<DA_BESOIN_AACHETERDto>
				rows={rows}
				columns={columns}
				rowCount={total}
				loading={loading}
				paginationModel={{ page: filter.pageIndex - 1, pageSize: filter.pageSize }}
				onPaginationModelChange={({ page, pageSize }) => {
					setFilter((p) => ({ ...p, pageIndex: page + 1, pageSize }));
				}}
				getRowId={(row) => asNumber(asRecord(row).B_No ?? asRecord(row).b_No)}
				selectedRowKey={selectedId || null}
				onRowClick={({ row }) => {
					const r = asRecord(row);
					const rowId = asNumber(r.B_No ?? r.b_No);
					setSelectedId(rowId);
					setSelected(r);
				}}
				onRowDoubleClick={({ row }) => void openAffectation(asRecord(row))}
			/>
		</div>
	);
}