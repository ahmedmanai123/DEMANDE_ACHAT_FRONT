// ============================================================
// hooks/useBesoin.ts
// Custom hooks — remplacent la logique jQuery / jsGrid
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { besoinService, articleBesoinService, validationService } from "../services/besoinService";
import type {
	DA_BESOINDto,
	DA_BESOIN_ARTICLEDto,
	DA_VALIDATION,
	Validateur_BesoinVM,
	Type_Validation,
	Etat_Besoin,
} from "../types/besoin";

// ── Helpers ──────────────────────────────────────────────────

/** Valeur par défaut d'un filtre paginé */
export function defaultFilter<T>(overrides?: Partial<T>): T & { pageIndex: number; pageSize: number } {
	return {
		pageIndex: 1,
		pageSize: 10,
		sortField: undefined,
		sortOrder: "desc",
		...(overrides ?? {}),
	} as any;
}

// ─────────────────────────────────────────────────────────────
// Hook : liste des demandes de besoin (remplace jsGridDB)
// ─────────────────────────────────────────────────────────────

export function useBesoinList() {
	const [data, setData] = useState<DA_BESOINDto[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<Partial<DA_BESOINDto>>(
		defaultFilter<Partial<DA_BESOINDto>>({
			B_Etat_Besoin: -1 as Etat_Besoin, // Tous
		}),
	);

	const load = useCallback(
		async (f?: Partial<DA_BESOINDto>) => {
			const active = f ?? filter;
			setLoading(true);
			setError(null);
			try {
				const resp = await besoinService.getAll(active);
				setData(resp.data);
				setTotal(resp.itemsCount);
			} catch (e: any) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		},
		[filter],
	);

	// Recharge automatique quand le filtre change
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		load(filter);
	}, [filter]);

	const updateFilter = useCallback((patch: Partial<DA_BESOINDto>) => {
		setFilter((prev: Partial<DA_BESOINDto>) => ({ ...prev, ...patch, pageIndex: 1 }));
	}, []);

	const changePage = useCallback((pageIndex: number, pageSize?: number) => {
		setFilter((prev: Partial<DA_BESOINDto>) => ({ ...prev, pageIndex, ...(pageSize ? { pageSize } : {}) }));
	}, []);

	const exportExcel = useCallback(async () => {
		await besoinService.exportExcel(filter);
	}, [filter]);

	return { data, total, loading, error, filter, updateFilter, changePage, reload: load, exportExcel };
}

// ─────────────────────────────────────────────────────────────
// Hook : articles d'un besoin (remplace jsGridArticles)
// ─────────────────────────────────────────────────────────────

export function useBesoinArticles(besoinId: number, bT_Id?: number) {
	const [data, setData] = useState<DA_BESOIN_ARTICLEDto[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState<Partial<DA_BESOIN_ARTICLEDto>>(
		defaultFilter({ B_BesoinId: besoinId, BT_Id: bT_Id, pageSize: 50 }),
	);

	const load = useCallback(async () => {
		if (!besoinId) return;
		setLoading(true);
		try {
			const resp = await articleBesoinService.getAll({ ...filter, B_BesoinId: besoinId });
			setData(resp.data);
			setTotal(resp.itemsCount);
		} finally {
			setLoading(false);
		}
	}, [besoinId, filter]);

	useEffect(() => {
		load();
	}, [load]);

	const saveArticle = useCallback(
		async (article: Partial<DA_BESOIN_ARTICLEDto>) => {
			await articleBesoinService.save({ ...article, B_BesoinId: besoinId });
			await load();
		},
		[besoinId, load],
	);

	const deleteArticle = useCallback(
		async (bA_No: number) => {
			await articleBesoinService.delete(bA_No);
			await load();
		},
		[load],
	);

	return { data, total, loading, load, saveArticle, deleteArticle, filter, setFilter };
}

// ─────────────────────────────────────────────────────────────
// Hook : circuit de validation (remplace jsGridValidateurBesoin)
// ─────────────────────────────────────────────────────────────

export function useCircuitValidation(bT_Id: number, idBesoin: number, idDemandeur: string, v_Type: Type_Validation) {
	const [validateurs, setValidateurs] = useState<Validateur_BesoinVM[]>([]);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async () => {
		if (!bT_Id || !idDemandeur) return;
		setLoading(true);
		try {
			const list = await validationService.getCircuit(bT_Id, idBesoin, idDemandeur, v_Type);
			setValidateurs(list);
		} finally {
			setLoading(false);
		}
	}, [bT_Id, idBesoin, idDemandeur, v_Type]);

	useEffect(() => {
		load();
	}, [load]);

	return { validateurs, loading, reload: load };
}

// ─────────────────────────────────────────────────────────────
// Hook : action de validation (valider / rejeter / rectifier)
// ─────────────────────────────────────────────────────────────

export function useValidationAction(onSuccess?: () => void) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = useCallback(
		async (validation: DA_VALIDATION) => {
			setLoading(true);
			setError(null);
			try {
				await validationService.validerEtape(validation);
				onSuccess?.();
			} catch (e: any) {
				setError(e.message);
				throw e;
			} finally {
				setLoading(false);
			}
		},
		[onSuccess],
	);

	return { submit, loading, error };
}

// ─────────────────────────────────────────────────────────────
// Hook : sauvegarde d'un besoin (create / update)
// ─────────────────────────────────────────────────────────────

export function useSaveBesoin(onSuccess?: (b_No: number) => void) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const save = useCallback(
		async (besoin: Partial<DA_BESOINDto>, files?: File[]) => {
			setLoading(true);
			setError(null);
			try {
				const result = await besoinService.save(besoin, files);
				onSuccess?.(result.b_No);
				return result;
			} catch (e: any) {
				setError(e.message);
				throw e;
			} finally {
				setLoading(false);
			}
		},
		[onSuccess],
	);

	return { save, loading, error };
}
