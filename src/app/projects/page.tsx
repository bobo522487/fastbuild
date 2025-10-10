"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { ProjectForm } from "~/components/project/project-form";
import { ProjectList } from "~/components/project/project-list";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Toaster } from "~/components/ui/toaster";

export default function ProjectsPage() {
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	// 处理项目创建成功
	const handleProjectCreated = () => {
		setShowCreateForm(false);
		// 刷新项目列表
		setRefreshKey((prev) => prev + 1);
	};

	// 处理取消创建
	const handleCancelCreate = () => {
		setShowCreateForm(false);
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div key={refreshKey}>
				<ProjectList onCreateProject={() => setShowCreateForm(true)} />
			</div>

			{/* 创建项目对话框 */}
			<Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
				<DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center justify-between">
							创建新项目
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setShowCreateForm(false)}
								className="h-6 w-6"
							>
								<X className="h-4 w-4" />
							</Button>
						</DialogTitle>
					</DialogHeader>
					<ProjectForm
						onSuccess={handleProjectCreated}
						onCancel={handleCancelCreate}
					/>
				</DialogContent>
			</Dialog>

			<Toaster />
		</div>
	);
}
