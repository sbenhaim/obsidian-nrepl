import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Vault } from 'obsidian';

// Remember to rename these classes and interfaces!

interface ObsidianNreplSettings {
	port: number;
}

const DEFAULT_SETTINGS: ObsidianNreplSettings = {
	port: 64323
}

export default class ObsidianNrepl extends Plugin {
	settings: ObsidianNreplSettings;
	_client: any;

	async onload() {
		await this.loadSettings();

		let client:any;
		let connected:boolean = false;


		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command

		this.addCommand({
			id: 'chat-doc',
			name: 'Chat Doc',
			callback: () => {

				const file = this.app.workspace.getActiveFile();

				if (! file) {
					return;
				}

				const vaultPath = (this.app.vault.adapter as any).basePath;
				const filePath = file.path;
				const md = this.app.metadataCache;

				const fm = md.getFileCache(file).frontmatter;


				if (fm.sysprompt) {
					const match = fm.sysprompt.match(/\[\[(.+?)\]\]/);
					if (match) {
						const link = match[1];
						const promptFile = md.getFirstLinkpathDest(link, filePath)
						const promptPath = promptFile.path;
						fm.sysprompt = vaultPath + "/" + promptPath;
					}
				}

				const opts = this.toEdn(fm);

				const expr = `(obsidian-ai.core/chat-doc! "${vaultPath}" "${filePath}" ${opts})`;

				this.eval(expr);
			}
		});


		this.addCommand({
			id: 'octo-chat-doc',
			name: 'Octopus Chat Doc',
			callback: () => {

				const file = this.app.workspace.getActiveFile();

				if (! file) {
					return;
				}

				const fileName = file.name.replace(/\..*?$/, '')

				const expr = `(octopus.md/chat-doc! "${fileName}")`;

				console.log(expr);

				this.eval(expr);
			}
		});


		this.addCommand({
			id: 'octo-chat-doc-inverse',
			name: 'Octopus Inverse Chat Doc',
			callback: () => {

				const file = this.app.workspace.getActiveFile();

				if (! file) {
					return;
				}

				const fileName = file.name.replace(/\..*?$/, '')

				const expr = `(octopus.md/chat-doc-inverse! "${fileName}")`;

				console.log(expr);

				this.eval(expr);
			}
		});



		this.addCommand({
			id: 'gen-image',
			name: 'Generate Image',
			callback: () => {

				const file = this.app.workspace.getActiveFile();

				if (! file) {
					return;
				}

				const vaultPath = (this.app.vault.adapter as any).basePath;
				const filePath = file.path;
				const md = this.app.metadataCache;

				const fm = md.getFileCache(file).frontmatter;

				fm['model'] = fm['image-model'];
				delete fm['image-model'];

				const opts = this.toEdn(fm);

				const expr = `(obsidian-ai.core/gen-image! "${vaultPath}" "${filePath}" ${opts})`;

				console.log(expr);

				this.eval(expr);
			}
		});



		this.addCommand({
			id: 'nrepl-eval',
			name: 'nREPL Eval',
			callback: () => {

				const editor = this.app.workspace.activeEditor;
				const expr = editor?.editor?.getSelection();

				if (expr) {
					this.eval(expr, (r:string) => {
						new Notice(r);
					});
				}
			}
		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsidianNreplSettingTab(this.app, this));


		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	toEdn(obj:any) {

		let json:string = JSON.stringify(obj);
		return json.replaceAll(":", " ");
	}


	getClient() {

		if (this._client) {
			return this._client;
		}

		let client = require('nrepl-client').connect({port: this.settings.port, host: '127.0.0.1'});
		client.setKeepAlive(true, 30000);
		console.log(client);
		this._client = client;


		return this._client;
	}

	eval(expr:string, callback?:Function) {

		let client:any = this.getClient();

		client.eval(expr, function(err, result) {
			console.log('%s => ', expr, err || result[0].value);
			if (!err && callback) {
				callback(result[0].value);
			}
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class ObsidianNreplSettingTab extends PluginSettingTab {
	plugin: ObsidianNrepl;

	constructor(app: App, plugin: ObsidianNrepl) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('nREPL Port')
			.setDesc('')
			.addText(port => port
				.setPlaceholder('Enter nREPL port')
				.setValue(this.plugin.settings.port)
				.onChange(async (value) => {
					this.plugin.settings.port = value;
					await this.plugin.saveSettings();
				}));
	}
}
