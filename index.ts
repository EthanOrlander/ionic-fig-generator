import * as fs from "fs";
import { exec as OriginalExec } from "child_process";
import { promisify } from "util";

const exec = promisify(OriginalExec);

const generateCommands = () => exec('yarn ionic help --json');

const attachSubcommand = (completionSpec: Fig.Spec, commandStr: string): Fig.Subcommand => {
    const commandPieces = commandStr.split(" ").slice(1);
    let last = completionSpec;
    if (!last) throw Error('Err');
    for (const subcommand of commandPieces) {
        if (!last.subcommands) last.subcommands = [];
        if (!last.subcommands.find(sc => sc.name === subcommand))
            last.subcommands.push({ name: subcommand })
        last = last.subcommands.find(sc => sc.name === subcommand) as Fig.Subcommand;
    }
    return last;
}

const generateSpec = (commands: any): Fig.Spec => {
    const completionSpec: Fig.Spec = {
        name: 'ionic',
        description: 'The Ionic command-line interface (CLI) is the go-to tool for developing Ionic apps.',
        subcommands: []
    }
    for (const command of commands.commands) {
        const subcommand: Fig.Subcommand = attachSubcommand(completionSpec, command.name);
        if (command.options && command.options.length > 0) {
            subcommand.options = command.options.map((option: any) => {
                const args: Fig.Arg | undefined = option.type === 'string' ? { name: option.spec.value } : undefined;
                const names = [`--${option.name}`].concat(option.aliases.map((alias: string) => `-${alias}`));
                return ({ name: names, description: option.summary, args: args })
            })
        }
        if (command.inputs && command.inputs.length > 0)
            subcommand.args = command.inputs.map((input: any) => ({ name: input.name, description: input.summary, isOptional: !input.required }));
        subcommand.description = command.summary;
    }
    fs.writeFileSync('out/spec.json', JSON.stringify(completionSpec));
    return completionSpec;
}

(async () => {
    const { stdout } = await generateCommands();
    const sanitizedOutput = stdout.split("\n")[1];
    const commands = JSON.parse(sanitizedOutput);
    generateSpec(commands);
    console.log("Fig autocomplete spec generated successfully!");
})();