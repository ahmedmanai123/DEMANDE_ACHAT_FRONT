/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
import {
	AlignCenterOutlined,
	AlignLeftOutlined,
	AlignRightOutlined,
	BgColorsOutlined,
	BoldOutlined,
	CodeOutlined,
	EyeOutlined,
	FontSizeOutlined,
	ItalicOutlined,
	LinkOutlined,
	OrderedListOutlined,
	PaperClipOutlined,
	UnderlineOutlined,
	UnorderedListOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Divider, Row, Space, Tooltip } from "antd";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface SimpleEditorProps {
	value: string;
	onChange: (content: string) => void;
	placeholder?: string;
	height?: number;
	disabled?: boolean;
}

const SimpleEditor: React.FC<SimpleEditorProps> = ({
	value,
	onChange,
	placeholder = "Rédigez votre email ici...",
	height = 400,
	disabled = false,
}) => {
	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const [showToolbar, setShowToolbar] = useState(true);
	const editorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (editorRef.current && !isPreviewMode) {
			editorRef.current.innerHTML = value;
		}
	}, [value, isPreviewMode]);

	const handleContentChange = () => {
		if (editorRef.current && !isPreviewMode) {
			const content = editorRef.current.innerHTML;
			onChange(content);
		}
	};

	const execCommand = (command: string, value?: string) => {
		document.execCommand(command, false, value);
		editorRef.current?.focus();
		handleContentChange();
	};

	const insertLink = () => {
		const url = prompt("Entrez l'URL du lien:");
		if (url) {
			execCommand("createLink", url);
		}
	};

	const insertList = (ordered: boolean = false) => {
		const command = ordered ? "insertOrderedList" : "insertUnorderedList";
		execCommand(command);
	};

	const alignText = (alignment: string) => {
		execCommand(`justify${alignment}`);
	};

	const changeFontSize = (size: string) => {
		execCommand("fontSize", size);
	};

	const changeColor = (color: string) => {
		execCommand("foreColor", color);
	};

	const insertVariable = (variable: string) => {
		const span = `<span style="background-color: #ffeb3b; padding: 2px 4px; border-radius: 3px;">{{${variable}}}</span>`;
		document.execCommand("insertHTML", false, span);
		handleContentChange();
	};

	const toolbarStyle = {
		border: "1px solid #d9d9d9",
		borderBottom: "none",
		borderRadius: "6px 6px 0 0",
		padding: "8px",
		background: "#fafafa",
		display: showToolbar ? "block" : "none",
	};

	const editorStyle = {
		border: "1px solid #d9d9d9",
		borderRadius: showToolbar ? "0 0 6px 6px" : "6px",
		minHeight: `${height}px`,
		padding: "16px",
		background: "#fff",
		fontFamily: "inherit",
		fontSize: "14px",
		lineHeight: "1.6",
		overflow: "auto",
		resize: "vertical" as const,
		cursor: disabled ? "not-allowed" : "text",
	};

	const previewStyle = {
		border: "1px solid #d9d9d9",
		borderRadius: "6px",
		minHeight: `${height}px`,
		padding: "16px",
		background: "#fff",
		overflow: "auto",
		resize: "vertical" as const,
	};

	if (isPreviewMode) {
		return (
			<div className="rich-editor-preview">
				<div style={{ marginBottom: "8px" }}>
					<Space>
						<Button icon={<EyeOutlined />} onClick={() => setIsPreviewMode(false)} type="primary">
							Mode Édition
						</Button>
						<span className="text-gray-500">Prévisualisation HTML</span>
					</Space>
				</div>
				<div style={previewStyle}>
					{/** biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation> */}
					<div dangerouslySetInnerHTML={{ __html: value }} />
				</div>
			</div>
		);
	}

	return (
		<div className="rich-editor">
			{/* Toolbar */}
			<div style={toolbarStyle}>
				<Row gutter={[4, 4]} align="middle">
					<Col>
						<Space size="small">
							<Tooltip title="Gras">
								<Button size="small" icon={<BoldOutlined />} onClick={() => execCommand("bold")} />
							</Tooltip>
							<Tooltip title="Italique">
								<Button size="small" icon={<ItalicOutlined />} onClick={() => execCommand("italic")} />
							</Tooltip>
							<Tooltip title="Souligné">
								<Button size="small" icon={<UnderlineOutlined />} onClick={() => execCommand("underline")} />
							</Tooltip>
						</Space>
					</Col>

					<Col>
						<Divider type="vertical" />
					</Col>

					<Col>
						<Space size="small">
							<Tooltip title="Liste à puces">
								<Button size="small" icon={<UnorderedListOutlined />} onClick={() => insertList(false)} />
							</Tooltip>
							<Tooltip title="Liste numérotée">
								<Button size="small" icon={<OrderedListOutlined />} onClick={() => insertList(true)} />
							</Tooltip>
						</Space>
					</Col>

					<Col>
						<Divider type="vertical" />
					</Col>

					<Col>
						<Space size="small">
							<Tooltip title="Aligner à gauche">
								<Button size="small" icon={<AlignLeftOutlined />} onClick={() => alignText("Left")} />
							</Tooltip>
							<Tooltip title="Centrer">
								<Button size="small" icon={<AlignCenterOutlined />} onClick={() => alignText("Center")} />
							</Tooltip>
							<Tooltip title="Aligner à droite">
								<Button size="small" icon={<AlignRightOutlined />} onClick={() => alignText("Right")} />
							</Tooltip>
						</Space>
					</Col>

					<Col>
						<Divider type="vertical" />
					</Col>

					<Col>
						<Space size="small">
							<Tooltip title="Lien">
								<Button size="small" icon={<LinkOutlined />} onClick={insertLink} />
							</Tooltip>
							<Tooltip title="Code">
								<Button size="small" icon={<CodeOutlined />} onClick={() => execCommand("formatBlock", "<pre>")} />
							</Tooltip>
						</Space>
					</Col>

					<Col flex="auto">
						<div className="text-right">
							<Space size="small">
								<Tooltip title="Prévisualiser">
									<Button size="small" icon={<EyeOutlined />} onClick={() => setIsPreviewMode(true)} />
								</Tooltip>
								<Tooltip title={showToolbar ? "Masquer la barre" : "Afficher la barre"}>
									<Button size="small" onClick={() => setShowToolbar(!showToolbar)}>
										{showToolbar ? "▲" : "▼"}
									</Button>
								</Tooltip>
							</Space>
						</div>
					</Col>
				</Row>

				{/* Variables rapides */}
				<Row style={{ marginTop: "8px" }}>
					<Col span={24}>
						<Space size="small" wrap>
							<span className="text-gray-500 text-xs">Variables rapides:</span>
							<Button size="small" onClick={() => insertVariable("NomClient")}>
								{"{NomClient}"}
							</Button>
							<Button size="small" onClick={() => insertVariable("Date")}>
								{"{Date}"}
							</Button>
							<Button size="small" onClick={() => insertVariable("Reference")}>
								{"{Reference}"}
							</Button>
							<Button size="small" onClick={() => insertVariable("Montant")}>
								{"{Montant}"}
							</Button>
						</Space>
					</Col>
				</Row>
			</div>

			{/* Editor */}
			<div
				ref={editorRef}
				contentEditable={!disabled}
				style={{
					...editorStyle,
					...(value === "" && {
						position: "relative",
					}),
				}}
				onInput={handleContentChange}
				onBlur={handleContentChange}
				suppressContentEditableWarning={true}
				data-placeholder={placeholder}
			>
				{value === "" && (
					<div
						style={{
							position: "absolute",
							top: "16px",
							left: "16px",
							color: "#bfbfbf",
							pointerEvents: "none",
							userSelect: "none",
						}}
					>
						{placeholder}
					</div>
				)}
			</div>

			{/* Instructions */}
			<div style={{ fontSize: "12px", color: "#8c8c8c", marginTop: "8px" }}>
				<Space split={<Divider type="vertical" />}>
					<span>Ctrl+B: Gras</span>
					<span>Ctrl+I: Italique</span>
					<span>Ctrl+U: Souligné</span>
					<span>Variables: {"{variable}"}</span>
				</Space>
			</div>
		</div>
	);
};

export default SimpleEditor;
