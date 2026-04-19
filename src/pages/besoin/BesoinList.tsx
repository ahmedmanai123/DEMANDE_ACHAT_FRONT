import { EyeOutlined, FileExcelOutlined, InfoCircleOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, ConfigProvider, DatePicker, Input, Modal, Select, Space, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ProDataGrid, { type AntColDef } from "@/pages/article/ProDataGrid";
import * as besoinService from "@/services/besoinService";
import { useBesoinStore } from "@/store/useBesoinStore";
import { Etat_Besoin, type IBesoin } from "@/types/besoin";
import { ETAT_BESOIN_LABELS, getEtatBesoinProgressBar } from "@/utils/besoin.utils";
import frFR from "antd/locale/fr_FR";

const { Option } = Select;
const { RangePicker } = DatePicker;

dayjs.locale("fr");

interface Props {
	onEdit: (b_No: number) => void;
	onView: (b_No: number) => void;
	onNew: () => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const asRecord = (row: IBesoin): Record<string, unknown> => row as Record<string, unknown>;

const getBesoinId = (row: IBesoin): number => Number(asRecord(row).b_No ?? asRecord(row).B_No ?? 0);

const readChampLibreCell = (row: IBesoin, key: string): string => {
	const r = asRecord(row);
	const bag = r.ChampsLibres ?? r.champsLibres;
	if (bag && typeof bag === "object" && !Array.isArray(bag)) {
		const v = (bag as Record<string, unknown>)[key];
		if (v != null && v !== "") return String(v);
	}
	const dotted = r[`ChampsLibres.${key}`];
	if (dotted != null && dotted !== "") return String(dotted);
	const direct = r[key];
	return direct != null && direct !== "" ? String(direct) : "";
};

export default function BesoinList({ onEdit, onView, onNew }: Props) {
	const {
		besoins,
		totalCount,
		loading,
		filter,
		setFilter,
		fetchBesoins,
		setSelectedId,
		selectedId,
		champsLibreColumnKeys,
	} = useBesoinStore();

	const [rangeValue, setRangeValue] = useState<[Dayjs, Dayjs] | null>(() => {
		const start = filter.dateDebut ? dayjs(String(filter.dateDebut)) : dayjs().startOf("isoWeek");
		const end = filter.dateFin ? dayjs(String(filter.dateFin)) : dayjs().endOf("isoWeek");
		return [start, end];
	});

	useEffect(() => {
		const start = filter.dateDebut ? dayjs(String(filter.dateDebut)) : dayjs().startOf("isoWeek");
		const end = filter.dateFin ? dayjs(String(filter.dateFin)) : dayjs().endOf("isoWeek");
		setRangeValue([start, end]);
	}, [filter.dateDebut, filter.dateFin]);

	useEffect(() => {
		void fetchBesoins();
	}, [
		fetchBesoins,
		filter.pageIndex,
		filter.pageSize,
		filter.b_Numero,
		filter.b_Titre,
		filter.b_Demandeur,
		filter.b_Etat_Besoin,
		filter.B_Etat_Besoin,
		filter.dateDebut,
		filter.dateFin,
	]);

	const showRecapPlaceholder = useCallback((row: IBesoin) => {
		const num = String(asRecord(row).b_Numero ?? asRecord(row).B_Numero ?? "");
		Modal.info({
			title: `Récap de validation — ${num || "—"}`,
			content:
				"Équivalent de la popup ValidateurBesoin côté MVC : branchez l’API / circuit de validation pour afficher le détail ici.",
		});
	}, []);

	const handleExportExcel = async () => {
		try {
			const response = await besoinService.exportBesoinExcel(filter);
			const fileName =
				(response.headers["file-name"] as string | undefined) ||
				`Liste_Demandes_Besoin_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`;

			const url = URL.createObjectURL(response.data);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = fileName;
			anchor.click();
			URL.revokeObjectURL(url);
			toast.success("Fichier téléchargé.");
		} catch (error) {
			console.error("Erreur export Excel", error);
			toast.error("Échec de l’export Excel.");
		}
	};

	const handleNewClick = async () => {
		try {
			const res = await besoinService.existTypeBesoinUser();
			const valid = res.isValid !== false && res.IsValid !== false;
			const msg = res.Message ?? res.message;
			if (!valid) {
				toast.error(msg?.trim() || "Action non autorisée.");
				return;
			}
			const exist = res.exist_Type_Besoin ?? res.Exist_Type_Besoin;
			if (!exist) {
				toast.error("Aucun type de besoin autorisé pour créer une demande.");
				return;
			}
			onNew();
		} catch {
			toast.error("Impossible de vérifier les droits de création.");
		}
	};

	const columns = useMemo((): AntColDef<IBesoin>[] => {
		const base: AntColDef<IBesoin>[] = [
			{
				field: "b_Numero",
				headerName: "Numéro",
				width: 100,
				renderCell: ({ row }) => {
					const num = String(asRecord(row).b_Numero ?? asRecord(row).B_Numero ?? "");
					return (
						<button
							type="button"
							className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-[#e2552d] underline"
							onClick={(e) => {
								e.stopPropagation();
								onEdit(getBesoinId(row));
							}}
						>
							{num || "—"}
						</button>
					);
				},
			},
			{ field: "b_Titre", headerName: "Titre", width: 160 },
			{
				field: "b_Date",
				headerName: "Date création",
				width: 120,
				renderCell: ({ row }) => {
					const v = asRecord(row).b_Date ?? asRecord(row).B_Date;
					return v ? new Date(String(v)).toLocaleDateString("fr-FR") : "—";
				},
			},
			{ field: "b_Demandeur", headerName: "Demandeur", width: 120 },
			{ field: "cA_Intitule", headerName: "Affaire", width: 140 },
			{ field: "dE_Intitule", headerName: "Dépôt", width: 120 },
			{
				field: "b_Etat_Besoin",
				headerName: "État",
				width: 160,
				renderCell: ({ value }) => {
					const etat = Number(value);
					const label = ETAT_BESOIN_LABELS[etat] ?? `État ${etat}`;
					const { widthPct, barColor } = getEtatBesoinProgressBar(etat);
					return (
						<div className="min-w-[100px]">
							<div className="text-xs font-semibold">{label}</div>
							<div className="mt-0.5 h-1 overflow-hidden rounded-sm bg-[#e1e1e1]">
								<div
									className="h-full transition-[width] duration-500"
									style={{ width: `${widthPct}%`, backgroundColor: barColor }}
								/>
							</div>
						</div>
					);
				},
			},
		];

		const dynamiques: AntColDef<IBesoin>[] = champsLibreColumnKeys.map((key) => ({
			key: `cl_${key}`,
			headerName: key,
			width: 120,
			renderCell: ({ row }) => readChampLibreCell(row, key),
		}));

		const actions: AntColDef<IBesoin>[] = [
			{
				key: "actions",
				headerName: " ",
				width: 88,
				renderCell: ({ row }) => (
					<Space size={4}>
						<Button
							type="text"
							size="small"
							icon={<EyeOutlined />}
							title="Consulter"
							onClick={(e) => {
								e.stopPropagation();
								onView(getBesoinId(row));
							}}
						/>
						<Button
							type="text"
							size="small"
							icon={<InfoCircleOutlined />}
							title="Récap de validation"
							onClick={(e) => {
								e.stopPropagation();
								showRecapPlaceholder(row);
							}}
						/>
					</Space>
				),
			},
		];

		return [...base, ...dynamiques, ...actions];
	}, [champsLibreColumnKeys, onEdit, onView, showRecapPlaceholder]);

	const onRangeChange = (dates: null | [Dayjs | null, Dayjs | null]) => {
		if (!dates || !dates[0] || !dates[1]) return;
		setRangeValue([dates[0], dates[1]]);
		setFilter({
			dateDebut: dates[0].format("YYYY-MM-DD"),
			dateFin: dates[1].format("YYYY-MM-DD"),
		});
	};

	return (
		<ConfigProvider locale={frFR}>
			<div className="mx-auto max-w-[1400px] space-y-4 px-4 py-4">
				<div className="flex flex-col gap-1 border-b border-border pb-3">
					<Typography.Title level={4} className="!mb-0">
						Demandes de besoin
					</Typography.Title>
					<Typography.Text type="secondary" className="text-sm">
						Filtrez par période, état et colonnes dynamiques (champs libres) comme sur la vue MVC.
					</Typography.Text>
				</div>

				<div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
					<Space wrap size="middle" className="items-end">
						<div className="flex flex-col gap-1">
							<span className="text-xs font-medium text-muted-foreground">Lignes</span>
							<Select
								value={filter.pageSize ?? 20}
								style={{ width: 100 }}
								onChange={(pageSize) => setFilter({ pageSize: Number(pageSize) })}
								options={PAGE_SIZE_OPTIONS.map((n) => ({ label: String(n), value: n }))}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-xs font-medium text-muted-foreground">Période</span>
							<RangePicker
								value={rangeValue}
								onChange={onRangeChange}
								format="DD/MM/YYYY"
								allowClear={false}
								className="min-w-[260px]"
							/>
						</div>
						<Input
							placeholder="Numéro"
							allowClear
							className="w-[120px]"
							value={String(filter.b_Numero ?? filter.B_Numero ?? "")}
							onChange={(e) => setFilter({ b_Numero: e.target.value })}
						/>
						<Input
							placeholder="Titre"
							allowClear
							className="w-[160px]"
							value={String(filter.b_Titre ?? filter.B_Titre ?? "")}
							onChange={(e) => setFilter({ b_Titre: e.target.value })}
						/>
						<Input
							placeholder="Demandeur"
							allowClear
							className="w-[140px]"
							value={String(filter.b_Demandeur ?? filter.B_Demandeur ?? "")}
							onChange={(e) => setFilter({ b_Demandeur: e.target.value })}
						/>
						<Select
							className="min-w-[220px]"
							value={Number(filter.b_Etat_Besoin ?? filter.B_Etat_Besoin ?? Etat_Besoin.Tous)}
							onChange={(value) => setFilter({ b_Etat_Besoin: value })}
							placeholder="État"
						>
							{Object.entries(ETAT_BESOIN_LABELS).map(([key, label]) => (
								<Option key={key} value={Number(key)}>
									{label}
								</Option>
							))}
						</Select>
						<Button icon={<ReloadOutlined />} onClick={() => void fetchBesoins()}>
							Actualiser
						</Button>
					</Space>

					<Space wrap>
						<Button type="primary" icon={<PlusOutlined />} onClick={() => void handleNewClick()}>
							Nouveau
						</Button>
						<Button
							type="default"
							disabled={!selectedId}
							onClick={() => {
								if (selectedId) onEdit(selectedId);
								else toast.warning("Sélectionnez une ligne.");
							}}
						>
							Détails
						</Button>
						<Button icon={<FileExcelOutlined />} onClick={() => void handleExportExcel()}>
							Exporter
						</Button>
					</Space>
				</div>

				<ProDataGrid<IBesoin>
					rows={besoins}
					columns={columns}
					rowCount={totalCount}
					loading={loading}
					paginationModel={{
						page: (filter.pageIndex ?? 1) - 1,
						pageSize: filter.pageSize ?? 20,
					}}
					onPaginationModelChange={({ page, pageSize }) => setFilter({ pageIndex: page + 1, pageSize })}
					getRowId={(row) => getBesoinId(row)}
					selectedRowKey={selectedId || null}
					onRowClick={({ row }) => setSelectedId(getBesoinId(row))}
					onRowDoubleClick={({ row }) => onEdit(getBesoinId(row))}
				/>
			</div>
		</ConfigProvider>
	);
}
