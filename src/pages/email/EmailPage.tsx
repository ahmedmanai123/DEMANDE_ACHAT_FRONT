import type React from "react";
import { useEffect } from "react";
import { useEmailStore } from "../../store/useEmailStore";
import EmailSidebar from "./EmailSidebar";
import HistoryDetail from "./HistoryDetail";
import HistoryList from "./HistoryList";
import TemplateForm from "./TemplateForm";
import TemplateList from "./TemplateList";

const EmailPage: React.FC = () => {
	const {
		activeView,
		selectedTemplate,
		history,
		selectedHistory,
		templates,
		isCreatingTemplate,
		fetchTemplates,
		fetchHistory,
		templatesCount,
		historyCount,
	} = useEmailStore();

	useEffect(() => {
		fetchTemplates();
		fetchHistory();
	}, [fetchTemplates, fetchHistory]);

	const renderContent = () => {
		console.log(
			"EmailPage renderContent - activeView:",
			activeView,
			"isCreatingTemplate:",
			isCreatingTemplate,
			"selectedTemplate:",
			!!selectedTemplate,
		);

		// Show template form when creating or editing
		if ((isCreatingTemplate || selectedTemplate) && activeView === "templates") {
			console.log("Rendering TemplateForm");
			return <TemplateForm />;
		}

		// Show template list by default
		if (activeView === "templates") {
			console.log("Rendering TemplateList");
			return <TemplateList />;
		}

		// Show history list
		if (activeView === "history") {
			console.log("Rendering HistoryList");
			return <HistoryList />;
		}

		console.log("Rendering default TemplateList");
		return <TemplateList />;
	};

	return (
		<div className="email-page min-h-screen bg-gray-50">
			<div className="flex flex-col lg:flex-row">
				{/* Sidebar - Hidden on mobile, visible on desktop */}
				<div className="hidden lg:block lg:w-72 bg-white border-r border-gray-200">
					<EmailSidebar />
				</div>

				{/* Mobile Sidebar Toggle */}
				<div className="lg:hidden bg-white border-b border-gray-200 p-2">
					<div className="flex items-center justify-between"></div>
					{/* Mobile Navigation */}
					<div className="mt-2 flex gap-1 overflow-x-auto">
						{/** biome-ignore lint/a11y/useButtonType: <explanation> */}
						<button
							onClick={() => useEmailStore.getState().setActiveView("templates")}
							className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
								activeView === "templates" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							Modèles
						</button>
						{/** biome-ignore lint/a11y/useButtonType: <explanation> */}
						<button
							onClick={() => useEmailStore.getState().setActiveView("history")}
							className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
								activeView === "history" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							Historiques
						</button>
						{/** biome-ignore lint/a11y/useButtonType: <explanation> */}
						<button
							onClick={() => useEmailStore.getState().setIsCreatingTemplate(true)}
							className="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium whitespace-nowrap hover:bg-green-600 transition-colors"
						>
							+ Nouveau
						</button>
					</div>
				</div>

				{/* Main Content - Full width with minimal padding */}
				<div className="flex-1 min-w-0">
					<div className="p-2 lg:p-3">
						{/* Desktop Header */}
						<div className="hidden lg:block mb-2">
							<div className="flex items-center justify-between px-1">
								{activeView === "templates" && (
									// biome-ignore lint/a11y/useButtonType: <explanation>
									<button
										onClick={() => useEmailStore.getState().setIsCreatingTemplate(true)}
										className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
									>
										Créer un modèle
									</button>
								)}
							</div>
						</div>

						{/* Content Area - Full width container */}
						<div className="bg-white rounded-lg shadow-sm px-1 py-1 lg:px-2 lg:py-2">{renderContent()}</div>
					</div>
				</div>
			</div>

			{/* Mobile Detail Modal */}
			{(selectedHistory || (selectedTemplate && activeView === "templates")) && (
				<div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
						{selectedHistory && <HistoryDetail />}
						{selectedTemplate && activeView === "templates" && <TemplateForm />}
					</div>
				</div>
			)}

			{/* History Detail Modal - Desktop only */}
			{selectedHistory && (
				<div className="hidden lg:block">
					<HistoryDetail />
				</div>
			)}
		</div>
	);
};

export default EmailPage;
