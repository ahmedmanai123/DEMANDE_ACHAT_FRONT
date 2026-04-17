import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons";
import {
	Button,
	Card,
	Col,
	Divider,
	Flex,
	Input,
	InputNumber,
	Modal,
	Popconfirm,
	Row,
	Select,
	Space,
	Switch,
	Table,
	Tabs,
	Tag,
	Typography,
	Upload,
	message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type {
	AffaireAutorise,
	AffaireItem,
	CategorieAutorise,
	DepotAutorise,
	DepotItem,
	MotifRectification,
	MotifRectificationPayload,
	ParametreEntity,
	SelectOptionItem,
} from "@/types/parametres";
import { parametresService } from "@/services/parametresService";

const motifTypeOptions = [
	{ value: 0, label: "Réinitialise le circuit" },
	{ value: 1, label: "Reprendre le circuit" },
	{ value: 2, label: "Dysfonctionnement" },
	{ value: 3, label: "Budget dépassé" },
];

const motifDemandeOptions = [
	{ value: 0, label: "Demande besoin" },
	{ value: 1, label: "Retour demande validation" },
];

const createDefaultParametre = (): ParametreEntity => ({
	pA_No: 0,
	pA_SMTP: "",
	pA_EmailDisplayName: "",
	pA_Port: null,
	pA_Mail: "",
	pA_MailCopie: "",
	pA_PWD: "",
	pA_SSL: false,
	pA_LogoSociete: "",
	pA_ImgFondEcran: "",
	d_RaisonSoc: "",
	d_Profession: "",
	d_Commentaire: "",
	d_Adresse: "",
	d_Complement: "",
	d_CodePostal: "",
	d_Ville: "",
	d_CodeRegion: "",
	d_Pays: "",
	d_Telephone: "",
	d_Telecopie: "",
	d_EMailSoc: "",
	d_Site: "",
	d_Siret: "",
	d_Identifiant: "",
	aR_RefDivers: "",
	pA_UserSage: "",
	pA_Souche: null,
	pA_CompteCredit: "",
	pA_CompteDebit: "",
	pA_Journal: "",
	pA_DossierSage: "",
});

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Une erreur est survenue.");

const normalizeImage = (imagePath: string | undefined | null) => {
	if (!imagePath) return undefined;
	const value = imagePath.trim();
	if (!value) return undefined;

	if (value.startsWith("http://") || value.startsWith("https://")) return value;
	if (value.startsWith("~/")) return value.replace("~", "");
	if (value.startsWith("./")) return value.replace(".", "");
	if (value.startsWith("file://")) return undefined;

	// Convert absolute Windows/server path to public static url.
	const normalized = value.replaceAll("\\", "/");
	const lower = normalized.toLowerCase();
	const picturesIndex = lower.indexOf("/pictures/");
	if (picturesIndex >= 0) {
		return normalized.substring(picturesIndex);
	}

	// Keep browser-safe relative/absolute web paths only.
	if (/^[a-z]:\//i.test(normalized) || normalized.startsWith("//")) return undefined;
	return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const MotifBadge = ({ type }: { type: number }) => {
	if (type === 0) return <Tag color="blue">Réinitialise le circuit</Tag>;
	if (type === 1) return <Tag color="cyan">Reprendre le circuit</Tag>;
	if (type === 2) return <Tag color="gold">Dysfonctionnement</Tag>;
	if (type === 3) return <Tag color="red">Budget dépassé</Tag>;
	return <Tag>Type inconnu</Tag>;
};

export default function ParametresPage() {
	const [messageApi, contextHolder] = message.useMessage();
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const [parametre, setParametre] = useState<ParametreEntity>(createDefaultParametre());
	const [logoFile, setLogoFile] = useState<File | undefined>();
	const [backgroundFile, setBackgroundFile] = useState<File | undefined>();

	const [depotsAutorises, setDepotsAutorises] = useState<DepotAutorise[]>([]);
	const [allDepots, setAllDepots] = useState<DepotItem[]>([]);
	const [depotPickerRows, setDepotPickerRows] = useState<DepotItem[]>([]);
	const [depotPickerOpen, setDepotPickerOpen] = useState(false);
	const [selectedDepotNos, setSelectedDepotNos] = useState<number[]>([]);

	const [affairesAutorisees, setAffairesAutorisees] = useState<AffaireAutorise[]>([]);
	const [allAffaires, setAllAffaires] = useState<AffaireItem[]>([]);
	const [affairePickerRows, setAffairePickerRows] = useState<AffaireItem[]>([]);
	const [affairePickerOpen, setAffairePickerOpen] = useState(false);
	const [selectedAffaireNos, setSelectedAffaireNos] = useState<string[]>([]);

	const [categoriesAutorisees, setCategoriesAutorisees] = useState<CategorieAutorise[]>([]);
	const [cataloguesN1, setCataloguesN1] = useState<SelectOptionItem<number>[]>([]);
	const [cataloguesN2, setCataloguesN2] = useState<SelectOptionItem<number>[]>([]);
	const [cataloguesN3, setCataloguesN3] = useState<SelectOptionItem<number>[]>([]);
	const [cataloguesN4, setCataloguesN4] = useState<SelectOptionItem<number>[]>([]);
	const [selectedCL1, setSelectedCL1] = useState<number>(0);
	const [selectedCL2, setSelectedCL2] = useState<number>(0);
	const [selectedCL3, setSelectedCL3] = useState<number>(0);
	const [selectedCL4, setSelectedCL4] = useState<number>(0);

	const [motifsRectification, setMotifsRectification] = useState<MotifRectification[]>([]);
	const [motifModalOpen, setMotifModalOpen] = useState(false);
	const [motifSaving, setMotifSaving] = useState(false);
	const [motifPayload, setMotifPayload] = useState<MotifRectificationPayload>({
		mR_No: 0,
		mR_Code: "",
		mR_Desgination: "",
		mR_TypeMotif: 0,
		mR_TypeDemande: 0,
	});

	const loadParametre = async () => {
		const loaded = await parametresService.getParametre();
		setParametre(loaded);
	};

	const loadDepots = async () => {
		const [autorises, disponibles] = await Promise.all([
			parametresService.getDepotsAutorises({ pageIndex: 1, pageSize: 300 }),
			parametresService.getDepots({ pageIndex: 1, pageSize: 1000 }),
		]);
		setDepotsAutorises(autorises.data);
		setAllDepots(disponibles.data);
	};

	const loadAffaires = async () => {
		const [autorisees, disponibles] = await Promise.all([
			parametresService.getAffairesAutorisees({ pageIndex: 1, pageSize: 300 }),
			parametresService.getAffaires({ pageIndex: 1, pageSize: 1000 }),
		]);
		setAffairesAutorisees(autorisees.data);
		setAllAffaires(disponibles.data);
	};

	const loadCategories = async () => {
		const [rows, n1] = await Promise.all([
			parametresService.getCategoriesAutorisees({ pageIndex: 1, pageSize: 300 }),
			parametresService.getCataloguesForSelect(0),
		]);
		setCategoriesAutorisees(rows.data);
		setCataloguesN1(n1);
	};

	const loadMotifs = async () => {
		const motifs = await parametresService.getRectificationMotifs({ pageIndex: 1, pageSize: 500 });
		setMotifsRectification(motifs.data);
	};

	const loadAll = async () => {
		setIsLoading(true);
		try {
			await Promise.all([loadParametre(), loadDepots(), loadAffaires(), loadCategories(), loadMotifs()]);
		} catch (error) {
			messageApi.error(getErrorMessage(error));
		} finally {
			setIsLoading(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		void loadAll();
	}, []);

	const logoPreview = useMemo(
		() => (logoFile ? URL.createObjectURL(logoFile) : normalizeImage(parametre.pA_LogoSociete)),
		[logoFile, parametre.pA_LogoSociete],
	);

	const backgroundPreview = useMemo(
		() => (backgroundFile ? URL.createObjectURL(backgroundFile) : normalizeImage(parametre.pA_ImgFondEcran)),
		[backgroundFile, parametre.pA_ImgFondEcran],
	);

	const depotColumns: ColumnsType<DepotAutorise> = [
		{
			title: "Intitulé dépôt",
			dataIndex: "dE_Intitule",
			key: "dE_Intitule",
		},
		{
			title: "Action",
			key: "actions",
			width: 120,
			render: (_, row) => (
				<Popconfirm
					title="Supprimer ce dépôt autorisé ?"
					okText="Oui"
					cancelText="Non"
					onConfirm={async () => {
						try {
							await parametresService.deleteDepotAutorise(row.dA_No);
							messageApi.success("Dépôt supprimé.");
							await loadDepots();
						} catch (error) {
							messageApi.error(getErrorMessage(error));
						}
					}}
				>
					<Button danger size="small" icon={<DeleteOutlined />} />
				</Popconfirm>
			),
		},
	];

	const affaireColumns: ColumnsType<AffaireAutorise> = [
		{
			title: "Numéro",
			dataIndex: "cA_Num",
			key: "cA_Num",
			width: 180,
		},
		{
			title: "Intitulé",
			dataIndex: "cA_Intitule",
			key: "cA_Intitule",
		},
		{
			title: "Action",
			key: "actions",
			width: 120,
			render: (_, row) => (
				<Popconfirm
					title="Supprimer cette affaire autorisée ?"
					okText="Oui"
					cancelText="Non"
					onConfirm={async () => {
						try {
							await parametresService.deleteAffaireAutorisee(row.fA_No);
							messageApi.success("Affaire supprimée.");
							await loadAffaires();
						} catch (error) {
							messageApi.error(getErrorMessage(error));
						}
					}}
				>
					<Button danger size="small" icon={<DeleteOutlined />} />
				</Popconfirm>
			),
		},
	];

	const categorieColumns: ColumnsType<CategorieAutorise> = [
		{ title: "Catalogue 1", dataIndex: "cL_Intitule1", key: "cL_Intitule1" },
		{ title: "Catalogue 2", dataIndex: "cL_Intitule2", key: "cL_Intitule2" },
		{ title: "Catalogue 3", dataIndex: "cL_Intitule3", key: "cL_Intitule3" },
		{ title: "Catalogue 4", dataIndex: "cL_Intitule4", key: "cL_Intitule4" },
		{
			title: "Action",
			key: "actions",
			width: 120,
			render: (_, row) => (
				<Popconfirm
					title="Supprimer cette catégorie autorisée ?"
					okText="Oui"
					cancelText="Non"
					onConfirm={async () => {
						try {
							await parametresService.deleteCategorieAutorisee(row.cA_No);
							messageApi.success("Catégorie supprimée.");
							await loadCategories();
						} catch (error) {
							messageApi.error(getErrorMessage(error));
						}
					}}
				>
					<Button danger size="small" icon={<DeleteOutlined />} />
				</Popconfirm>
			),
		},
	];

	const motifColumns: ColumnsType<MotifRectification> = [
		{ title: "Code", dataIndex: "mR_Code", key: "mR_Code", width: 160 },
		{ title: "Désignation", dataIndex: "mR_Desgination", key: "mR_Desgination" },
		{
			title: "Type motif",
			dataIndex: "mR_TypeMotif",
			key: "mR_TypeMotif",
			width: 240,
			render: (value: number) => <MotifBadge type={value} />,
		},
		{
			title: "Action",
			key: "actions",
			width: 180,
			render: (_, row) => (
				<Space>
					<Button
						size="small"
						icon={<EditOutlined />}
						onClick={() => {
							setMotifPayload({
								mR_No: row.mR_No,
								mR_Code: row.mR_Code,
								mR_Desgination: row.mR_Desgination,
								mR_TypeMotif: row.mR_TypeMotif,
								mR_TypeDemande: row.mR_TypeDemande,
							});
							setMotifModalOpen(true);
						}}
					/>
					<Popconfirm
						title="Supprimer ce motif ?"
						okText="Oui"
						cancelText="Non"
						onConfirm={async () => {
							try {
								await parametresService.deleteRectificationMotif(row.mR_No);
								messageApi.success("Motif supprimé.");
								await loadMotifs();
							} catch (error) {
								messageApi.error(getErrorMessage(error));
							}
						}}
					>
						<Button danger size="small" icon={<DeleteOutlined />} />
					</Popconfirm>
				</Space>
			),
		},
	];

	const handleSaveParametre = async () => {
		setIsSaving(true);
		try {
			await parametresService.saveParametre(parametre, logoFile, backgroundFile);
			messageApi.success("Paramètres enregistrés.");
			setLogoFile(undefined);
			setBackgroundFile(undefined);
			await loadParametre();
		} catch (error) {
			messageApi.error(getErrorMessage(error));
		} finally {
			setIsSaving(false);
		}
	};

	const openDepotPicker = () => {
		const alreadySelected = new Set(depotsAutorises.map((item) => item.dE_No ?? -1));
		const selectable = allDepots.filter((item) => (item.dE_No ?? -1) > 0 && !alreadySelected.has(item.dE_No ?? -1));
		setDepotPickerRows(selectable);
		setSelectedDepotNos([]);
		setDepotPickerOpen(true);
	};

	const openAffairePicker = () => {
		const alreadySelected = new Set(affairesAutorisees.map((item) => item.cA_Num));
		const selectable = allAffaires.filter((item) => item.cA_Num && !alreadySelected.has(item.cA_Num));
		setAffairePickerRows(selectable);
		setSelectedAffaireNos([]);
		setAffairePickerOpen(true);
	};

	const saveDepotsSelection = async () => {
		if (selectedDepotNos.length === 0) {
			messageApi.warning("Sélectionnez au moins un dépôt.");
			return;
		}
		try {
			await parametresService.addDepotAutorise(selectedDepotNos);
			messageApi.success("Dépôts autorisés enregistrés.");
			setDepotPickerOpen(false);
			await loadDepots();
		} catch (error) {
			messageApi.error(getErrorMessage(error));
		}
	};

	const saveAffairesSelection = async () => {
		if (selectedAffaireNos.length === 0) {
			messageApi.warning("Sélectionnez au moins une affaire.");
			return;
		}
		try {
			await parametresService.addAffairesAutorisees(selectedAffaireNos);
			messageApi.success("Affaires autorisées enregistrées.");
			setAffairePickerOpen(false);
			await loadAffaires();
		} catch (error) {
			messageApi.error(getErrorMessage(error));
		}
	};

	const handleCl1Change = async (value: number) => {
		setSelectedCL1(value);
		setSelectedCL2(0);
		setSelectedCL3(0);
		setSelectedCL4(0);
		setCataloguesN3([]);
		setCataloguesN4([]);
		if (value > 0) {
			const next = await parametresService.getCataloguesForSelect(value);
			setCataloguesN2(next);
		} else {
			setCataloguesN2([]);
		}
	};

	const handleCl2Change = async (value: number) => {
		setSelectedCL2(value);
		setSelectedCL3(0);
		setSelectedCL4(0);
		setCataloguesN4([]);
		if (value > 0) {
			const next = await parametresService.getCataloguesForSelect(value);
			setCataloguesN3(next);
		} else {
			setCataloguesN3([]);
		}
	};

	const handleCl3Change = async (value: number) => {
		setSelectedCL3(value);
		setSelectedCL4(0);
		if (value > 0) {
			const next = await parametresService.getCataloguesForSelect(value);
			setCataloguesN4(next);
		} else {
			setCataloguesN4([]);
		}
	};

	const addCategorieAutorisee = async () => {
		if (selectedCL1 <= 0) {
			messageApi.warning("Veuillez choisir au moins un catalogue niveau 1.");
			return;
		}
		try {
			await parametresService.addOrUpdateCategorieAutorisee({
				cA_No: 0,
				cL_No1: selectedCL1,
				cL_No2: selectedCL2,
				cL_No3: selectedCL3,
				cL_No4: selectedCL4,
			});
			messageApi.success("Catégorie autorisée enregistrée.");
			await loadCategories();
			setSelectedCL1(0);
			setSelectedCL2(0);
			setSelectedCL3(0);
			setSelectedCL4(0);
			setCataloguesN2([]);
			setCataloguesN3([]);
			setCataloguesN4([]);
		} catch (error) {
			messageApi.error(getErrorMessage(error));
		}
	};

	const saveMotif = async () => {
		if (!motifPayload.mR_Code.trim() || !motifPayload.mR_Desgination.trim()) {
			messageApi.warning("Le code et la désignation sont obligatoires.");
			return;
		}
		setMotifSaving(true);
		try {
			await parametresService.addOrUpdateRectificationMotif(motifPayload);
			messageApi.success("Motif enregistré.");
			setMotifModalOpen(false);
			setMotifPayload({
				mR_No: 0,
				mR_Code: "",
				mR_Desgination: "",
				mR_TypeMotif: 0,
				mR_TypeDemande: 0,
			});
			await loadMotifs();
		} catch (error) {
			messageApi.error(getErrorMessage(error));
		} finally {
			setMotifSaving(false);
		}
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			{contextHolder}
			<Card loading={isLoading}>
				<Flex justify="space-between" align="center" wrap="wrap" gap={12}>
					<div>
						<Typography.Title level={4} style={{ margin: 0 }}>
							Paramètres
						</Typography.Title>
						<Typography.Text type="secondary">
							Configuration globale, autorisations et motifs de rectification.
						</Typography.Text>
					</div>
					<Button type="primary" icon={<SaveOutlined />} onClick={() => void handleSaveParametre()} loading={isSaving}>
						Enregistrer
					</Button>
				</Flex>

				<Divider />

				<Tabs
					items={[
						{
							key: "general",
							label: "Général",
							children: (
								<Space direction="vertical" size={20} style={{ width: "100%" }}>
									<Card size="small" title="Logo & fond d'écran">
										<Row gutter={[16, 16]}>
											<Col xs={24} md={12}>
												<Typography.Text strong>Logo société</Typography.Text>
												<div style={{ marginTop: 8, marginBottom: 8 }}>
													<Upload
														maxCount={1}
														beforeUpload={(file) => {
															setLogoFile(file as File);
															return false;
														}}
														showUploadList={{ showRemoveIcon: true }}
													>
														<Button icon={<UploadOutlined />}>Choisir un logo</Button>
													</Upload>
												</div>
												{logoPreview ? (
													<img
														src={logoPreview}
														alt="Logo"
														style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8 }}
													/>
												) : null}
											</Col>
											<Col xs={24} md={12}>
												<Typography.Text strong>Fond écran connexion</Typography.Text>
												<div style={{ marginTop: 8, marginBottom: 8 }}>
													<Upload
														maxCount={1}
														beforeUpload={(file) => {
															setBackgroundFile(file as File);
															return false;
														}}
														showUploadList={{ showRemoveIcon: true }}
													>
														<Button icon={<UploadOutlined />}>Choisir un fond</Button>
													</Upload>
												</div>
												{backgroundPreview ? (
													<img
														src={backgroundPreview}
														alt="Fond écran"
														style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8 }}
													/>
												) : null}
											</Col>
										</Row>
									</Card>

									<Card size="small" title="E-mail">
										<Row gutter={[16, 16]}>
											<Col xs={24} md={12}>
												<Typography.Text>Nom d'affichage e-mail</Typography.Text>
												<Input
													value={parametre.pA_EmailDisplayName}
													onChange={(e) => setParametre((p) => ({ ...p, pA_EmailDisplayName: e.target.value }))}
												/>
											</Col>
											<Col xs={24} md={12}>
												<Typography.Text>SMTP</Typography.Text>
												<Input
													value={parametre.pA_SMTP}
													onChange={(e) => setParametre((p) => ({ ...p, pA_SMTP: e.target.value }))}
												/>
											</Col>
											<Col xs={24} md={8}>
												<Typography.Text>Port</Typography.Text>
												<InputNumber
													value={parametre.pA_Port ?? undefined}
													onChange={(value) => setParametre((p) => ({ ...p, pA_Port: value ?? null }))}
													style={{ width: "100%" }}
												/>
											</Col>
											<Col xs={24} md={8}>
												<Typography.Text>E-mail</Typography.Text>
												<Input
													value={parametre.pA_Mail}
													onChange={(e) => setParametre((p) => ({ ...p, pA_Mail: e.target.value }))}
												/>
											</Col>
											<Col xs={24} md={8}>
												<Typography.Text>Mot de passe</Typography.Text>
												<Input.Password
													value={parametre.pA_PWD}
													onChange={(e) => setParametre((p) => ({ ...p, pA_PWD: e.target.value }))}
												/>
											</Col>
											<Col xs={24} md={12}>
												<Typography.Text>Mails en copie (séparés par virgule)</Typography.Text>
												<Input
													value={parametre.pA_MailCopie}
													onChange={(e) => setParametre((p) => ({ ...p, pA_MailCopie: e.target.value }))}
												/>
											</Col>
											<Col xs={24} md={12}>
												<Space direction="vertical" size={8}>
													<Typography.Text>SSL</Typography.Text>
													<Switch
														checked={Boolean(parametre.pA_SSL)}
														onChange={(checked) => setParametre((p) => ({ ...p, pA_SSL: checked }))}
													/>
												</Space>
											</Col>
										</Row>
									</Card>

									<Card size="small" title="Comptabilisation & autres">
										<Row gutter={[16, 16]}>
											<Col xs={24} md={8}>
												<Typography.Text>Journal</Typography.Text>
												<Input
													value={parametre.pA_Journal}
													onChange={(e) => setParametre((p) => ({ ...p, pA_Journal: e.target.value }))}
												/>
											</Col>
											<Col xs={24} md={8}>
												<Typography.Text>Compte débit</Typography.Text>
												<Input
													value={parametre.pA_CompteDebit}
													onChange={(e) => setParametre((p) => ({ ...p, pA_CompteDebit: e.target.value }))}
												/>
											</Col>
											<Col xs={24} md={8}>
												<Typography.Text>Compte crédit</Typography.Text>
												<Input
													value={parametre.pA_CompteCredit}
													onChange={(e) => setParametre((p) => ({ ...p, pA_CompteCredit: e.target.value }))}
												/>
											</Col>
											<Col xs={24} md={8}>
												<Typography.Text>Utilisateur Sage</Typography.Text>
												<Input
													value={parametre.pA_UserSage}
													onChange={(e) => setParametre((p) => ({ ...p, pA_UserSage: e.target.value }))}
												/>
											</Col>
											<Col xs={24} md={8}>
												<Typography.Text>Souche document</Typography.Text>
												<InputNumber
													value={parametre.pA_Souche ?? undefined}
													onChange={(value) => setParametre((p) => ({ ...p, pA_Souche: value ?? null }))}
													style={{ width: "100%" }}
												/>
											</Col>
											<Col xs={24} md={8}>
												<Typography.Text>Article divers (réf)</Typography.Text>
												<Input
													value={parametre.aR_RefDivers}
													onChange={(e) => setParametre((p) => ({ ...p, aR_RefDivers: e.target.value }))}
												/>
											</Col>
											<Col xs={24}>
												<Typography.Text>Dossier Sage (multimedia)</Typography.Text>
												<Input
													value={parametre.pA_DossierSage}
													onChange={(e) => setParametre((p) => ({ ...p, pA_DossierSage: e.target.value }))}
												/>
											</Col>
										</Row>
									</Card>
								</Space>
							),
						},
						{
							key: "depots",
							label: "Dépôts autorisés",
							children: (
								<Space direction="vertical" size={12} style={{ width: "100%" }}>
									<Flex justify="end">
										<Button type="primary" icon={<PlusOutlined />} onClick={openDepotPicker}>
											Ajouter
										</Button>
									</Flex>
									<Table
										rowKey={(row) => row.dA_No}
										dataSource={depotsAutorises}
										columns={depotColumns}
										pagination={{ pageSize: 8 }}
									/>
								</Space>
							),
						},
						{
							key: "affaires",
							label: "Affaires autorisées",
							children: (
								<Space direction="vertical" size={12} style={{ width: "100%" }}>
									<Flex justify="end">
										<Button type="primary" icon={<PlusOutlined />} onClick={openAffairePicker}>
											Ajouter
										</Button>
									</Flex>
									<Table
										rowKey={(row) => `${row.fA_No}-${row.cA_Num}`}
										dataSource={affairesAutorisees}
										columns={affaireColumns}
										pagination={{ pageSize: 8 }}
									/>
								</Space>
							),
						},
						{
							key: "categories",
							label: "Catégories autorisées",
							children: (
								<Space direction="vertical" size={12} style={{ width: "100%" }}>
									<Row gutter={[8, 8]}>
										<Col xs={24} md={6}>
											<Select
												placeholder="Catalogue 1"
												value={selectedCL1 || undefined}
												onChange={(value) => void handleCl1Change(value)}
												options={cataloguesN1.map((item) => ({ value: item.value, label: item.text }))}
												style={{ width: "100%" }}
												allowClear
											/>
										</Col>
										<Col xs={24} md={6}>
											<Select
												placeholder="Catalogue 2"
												value={selectedCL2 || undefined}
												onChange={(value) => void handleCl2Change(value)}
												options={cataloguesN2.map((item) => ({ value: item.value, label: item.text }))}
												style={{ width: "100%" }}
												allowClear
											/>
										</Col>
										<Col xs={24} md={6}>
											<Select
												placeholder="Catalogue 3"
												value={selectedCL3 || undefined}
												onChange={(value) => void handleCl3Change(value)}
												options={cataloguesN3.map((item) => ({ value: item.value, label: item.text }))}
												style={{ width: "100%" }}
												allowClear
											/>
										</Col>
										<Col xs={24} md={6}>
											<Select
												placeholder="Catalogue 4"
												value={selectedCL4 || undefined}
												onChange={(value) => setSelectedCL4(value)}
												options={cataloguesN4.map((item) => ({ value: item.value, label: item.text }))}
												style={{ width: "100%" }}
												allowClear
											/>
										</Col>
									</Row>
									<Flex justify="end">
										<Button type="primary" icon={<SaveOutlined />} onClick={() => void addCategorieAutorisee()}>
											Ajouter catégorie
										</Button>
									</Flex>
									<Table
										rowKey={(row) => row.cA_No}
										dataSource={categoriesAutorisees}
										columns={categorieColumns}
										pagination={{ pageSize: 8 }}
									/>
								</Space>
							),
						},
						{
							key: "motifs",
							label: "Rectification motif",
							children: (
								<Space direction="vertical" size={12} style={{ width: "100%" }}>
									<Flex justify="end">
										<Button
											type="primary"
											icon={<PlusOutlined />}
											onClick={() => {
												setMotifPayload({
													mR_No: 0,
													mR_Code: "",
													mR_Desgination: "",
													mR_TypeMotif: 0,
													mR_TypeDemande: 0,
												});
												setMotifModalOpen(true);
											}}
										>
											Nouveau motif
										</Button>
									</Flex>
									<Table
										rowKey={(row) => row.mR_No}
										dataSource={motifsRectification}
										columns={motifColumns}
										pagination={{ pageSize: 8 }}
									/>
								</Space>
							),
						},
					]}
				/>
			</Card>

			<Modal
				title="Sélectionner des dépôts"
				open={depotPickerOpen}
				onCancel={() => setDepotPickerOpen(false)}
				onOk={() => void saveDepotsSelection()}
				okText="Enregistrer"
				cancelText="Annuler"
				width={900}
			>
				<Table
					rowKey={(row) => String(row.dE_No ?? 0)}
					dataSource={depotPickerRows}
					pagination={{ pageSize: 8 }}
					columns={[
						{ title: "N° dépôt", dataIndex: "dE_No", key: "dE_No", width: 120 },
						{ title: "Intitulé", dataIndex: "dE_Intitule", key: "dE_Intitule" },
					]}
					rowSelection={{
						type: "checkbox",
						selectedRowKeys: selectedDepotNos,
						onChange: (keys) => setSelectedDepotNos(keys.map((key) => Number(key))),
					}}
				/>
			</Modal>

			<Modal
				title="Sélectionner des affaires"
				open={affairePickerOpen}
				onCancel={() => setAffairePickerOpen(false)}
				onOk={() => void saveAffairesSelection()}
				okText="Enregistrer"
				cancelText="Annuler"
				width={900}
			>
				<Table
					rowKey={(row) => row.cA_Num}
					dataSource={affairePickerRows}
					pagination={{ pageSize: 8 }}
					columns={[
						{ title: "N° affaire", dataIndex: "cA_Num", key: "cA_Num", width: 180 },
						{ title: "Intitulé", dataIndex: "cA_Intitule", key: "cA_Intitule" },
					]}
					rowSelection={{
						type: "checkbox",
						selectedRowKeys: selectedAffaireNos,
						onChange: (keys) => setSelectedAffaireNos(keys.map((key) => String(key))),
					}}
				/>
			</Modal>

			<Modal
				title={motifPayload.mR_No > 0 ? "Modifier motif" : "Nouveau motif"}
				open={motifModalOpen}
				onCancel={() => setMotifModalOpen(false)}
				onOk={() => void saveMotif()}
				okText="Enregistrer"
				cancelText="Annuler"
				confirmLoading={motifSaving}
			>
				<Space direction="vertical" size={12} style={{ width: "100%" }}>
					<div>
						<Typography.Text>Code</Typography.Text>
						<Input
							value={motifPayload.mR_Code}
							onChange={(e) => setMotifPayload((prev) => ({ ...prev, mR_Code: e.target.value }))}
						/>
					</div>
					<div>
						<Typography.Text>Désignation</Typography.Text>
						<Input.TextArea
							value={motifPayload.mR_Desgination}
							rows={3}
							onChange={(e) => setMotifPayload((prev) => ({ ...prev, mR_Desgination: e.target.value }))}
						/>
					</div>
					<Row gutter={[12, 12]}>
						<Col xs={24} md={12}>
							<Typography.Text>Type motif</Typography.Text>
							<Select
								value={motifPayload.mR_TypeMotif}
								onChange={(value) => setMotifPayload((prev) => ({ ...prev, mR_TypeMotif: value }))}
								options={motifTypeOptions}
								style={{ width: "100%" }}
							/>
						</Col>
						<Col xs={24} md={12}>
							<Typography.Text>Type demande</Typography.Text>
							<Select
								value={motifPayload.mR_TypeDemande}
								onChange={(value) => setMotifPayload((prev) => ({ ...prev, mR_TypeDemande: value }))}
								options={motifDemandeOptions}
								style={{ width: "100%" }}
							/>
						</Col>
					</Row>
				</Space>
			</Modal>
		</div>
	);
}
