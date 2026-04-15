import { Button, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { FilterValue, SorterResult } from "antd/es/table/interface";
import { useCallback, useState } from "react";

const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColumnFilterConfig<T> {
	key: keyof T;
	type: "text" | "select";
	placeholder?: string;
	options?: { label: string; value: string | number }[];
}

export interface TableParams {
	pageIndex: number;
	pageSize: number;
	sortField?: string;
	sortOrder?: "asc" | "desc";
}

export interface ProDataGridProps<T extends object> {
	title?: string;
	subtitle?: string;
	columns: ColumnsType<T>;
	dataSource?: T[];
	totalCount?: number;
	loading?: boolean;
	rowKey: keyof T | ((record: T) => string);

	// Config des filtres par colonne — 1 entrée par colonne filtrable
	columnFilters?: ColumnFilterConfig<T>[];

	// Callback pagination/tri (pour appel API plus tard)
	onTableChange?: (params: TableParams) => void;

	// Valeurs des filtres contrôlées depuis le parent
	filterValues?: Partial<Record<keyof T, string | number>>;
	onFilterChange?: (key: keyof T, value: string | number | undefined) => void;
	onClearFilters?: () => void;

	defaultPageSize?: number;
	scrollX?: number;
	onExport?: () => void;

	// Cartes stats optionnelles
	stats?: { label: string; value: number | string; color?: string }[];
}

// ─── Sous-composant : input de filtre dans le header ─────────────────────────

function HeaderFilter<T>({
	config,
	value,
	onChange,
}: {
	config: ColumnFilterConfig<T>;
	value: string | number | undefined;
	onChange: (v: string | number | undefined) => void;
}) {
	if (config.type === "select") {
		return (
			<Select
				size="small"
				allowClear
				placeholder={config.placeholder ?? "Tous"}
				value={value !== undefined ? value : undefined}
				options={config.options}
				onChange={(v) => onChange(v ?? undefined)}
				style={{ width: "100%", marginTop: 4 }}
				onClick={(e) => e.stopPropagation()}
			/>
		);
	}

	return (
		<Input
			size="small"
			allowClear
			placeholder={config.placeholder ?? "Filtrer..."}
			value={value !== undefined ? String(value) : ""}
			onChange={(e) => onChange(e.target.value || undefined)}
			style={{ marginTop: 4 }}
			onClick={(e) => e.stopPropagation()}
		/>
	);
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ProDataGrid<T extends object>({
	title,
	subtitle,
	columns,
	dataSource = [],
	totalCount,
	loading = false,
	rowKey,
	columnFilters = [],
	onTableChange,
	filterValues = {},
	onFilterChange,
	onClearFilters,
	defaultPageSize = 10,
	scrollX = 1200,
	onExport,
	stats,
}: ProDataGridProps<T>) {
	const [tableParams, setTableParams] = useState<TableParams>({
		pageIndex: 1,
		pageSize: defaultPageSize,
	});

	// ── Injecte le filtre sous chaque header concerné ────────────────────────────
	const enrichedColumns: ColumnsType<T> = columns.map((col) => {
		const colKey = (col as { dataIndex?: keyof T }).dataIndex as keyof T;
		const filterConfig = columnFilters.find((f) => f.key === colKey);

		if (!filterConfig) return col;

		return {
			...col,
			title: (
				<div style={{ display: "flex", flexDirection: "column" }}>
					<span style={{ fontWeight: 500 }}>{col.title as string}</span>
					<HeaderFilter
						config={filterConfig}
						value={filterValues[colKey]}
						onChange={(v) => onFilterChange?.(colKey, v)}
					/>
				</div>
			),
		};
	});

	// ── Gestion tri + pagination ──────────────────────────────────────────────────
	const handleTableChange = useCallback(
		(
			pagination: TablePaginationConfig,
			_filters: Record<string, FilterValue | null>,
			sorter: SorterResult<T> | SorterResult<T>[],
		) => {
			const s = Array.isArray(sorter) ? sorter[0] : sorter;
			const params: TableParams = {
				pageIndex: pagination.current ?? 1,
				pageSize: pagination.pageSize ?? defaultPageSize,
				sortField: s.field as string,
				sortOrder: s.order === "descend" ? "desc" : "asc",
			};
			setTableParams(params);
			onTableChange?.(params);
		},
		[defaultPageSize, onTableChange],
	);

	// ── Filtres actifs (badges) ──────────────────────────────────────────────────
	const activeFilters = Object.entries(filterValues).filter(([, v]) => v !== undefined && v !== "");

	return (
		<div style={{ padding: 16 }}>
			{/* ── En-tête ── */}
			{(title || onExport) && (
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
					<div>
						{title && (
							<Title level={4} style={{ margin: 0 }}>
								{title}
							</Title>
						)}
						{subtitle && (
							<Text type="secondary" style={{ fontSize: 12 }}>
								{subtitle}
							</Text>
						)}
					</div>
					{onExport && (
						<Button type="primary" size="small" onClick={onExport}>
							📥 Export Excel
						</Button>
					)}
				</div>
			)}

			{/* ── Cartes stats ── */}
			{stats && stats.length > 0 && (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: `repeat(${stats.length}, minmax(0,1fr))`,
						gap: 8,
						marginBottom: 12,
					}}
				>
					{stats.map((s) => (
						<div key={s.label} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 8, padding: "8px 12px" }}>
							<div style={{ fontSize: 11, color: "gray", marginBottom: 2 }}>{s.label}</div>
							<div style={{ fontSize: 20, fontWeight: 500, color: s.color }}>{s.value}</div>
						</div>
					))}
				</div>
			)}

			{/* ── Tags filtres actifs ── */}
			{activeFilters.length > 0 && (
				<Space wrap style={{ marginBottom: 8 }}>
					{activeFilters.map(([key, value]) => (
						<Tag key={key} closable color="blue" onClose={() => onFilterChange?.(key as keyof T, undefined)}>
							{key}: {String(value)}
						</Tag>
					))}
					<Button size="small" danger type="link" onClick={onClearFilters}>
						Effacer tout
					</Button>
				</Space>
			)}

			{/* ── Table ── */}
			<Table<T>
				columns={enrichedColumns}
				dataSource={dataSource}
				rowKey={rowKey as string}
				loading={loading}
				size="small"
				bordered
				scroll={{ x: scrollX }}
				pagination={{
					current: tableParams.pageIndex,
					pageSize: tableParams.pageSize,
					total: totalCount ?? dataSource.length,
					showSizeChanger: true,
					showQuickJumper: true,
					showTotal: (total, range) => `${range[0]}–${range[1]} sur ${total} résultats`,
					pageSizeOptions: ["10", "20", "50", "100"],
				}}
				onChange={handleTableChange}
			/>
		</div>
	);
}

export default ProDataGrid;
