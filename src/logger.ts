import chalk from 'chalk';

export class Logger {
    private readonly accountUsername: string;
    private comments: number = 0;

    constructor(accountUsername: string = 'SYSTEM') {
        this.accountUsername = accountUsername;
    }

    private getTimestamp(): string {
        return `[${new Date().toLocaleTimeString()}]`;
    }

    private getPrefix(): string {
        return chalk.bold.cyan(`[${this.accountUsername}]`);
    }

    private getStatsString(): string {
        const parts: string[] = [];
        if (this.comments > 0) parts.push(chalk.yellow(`Commented: ${chalk.bold(this.comments)}`));

        if (parts.length === 0) return '';
        return `| ${parts.join(' | ')}`;
    }

    public info(message: string): void {
        console.log(`${chalk.gray(this.getTimestamp())} ${this.getPrefix()} ${message} ${this.getStatsString()}`);
    }

    public action(message: string): void {
        console.log(
            `${chalk.gray(this.getTimestamp())} ${this.getPrefix()} ${chalk.blueBright(message)} ${this.getStatsString()}`
        );
    }

    public success(message: string): void {
        console.log(
            `${chalk.gray(this.getTimestamp())} ${this.getPrefix()} ${chalk.greenBright(message)} ${this.getStatsString()}`
        );
    }

    public error(message: string): void {
        console.error(
            `${chalk.gray(this.getTimestamp())} ${this.getPrefix()} ${chalk.redBright(message)} ${this.getStatsString()}`
        );
    }

    public warn(message: string): void {
        console.log(
            `${chalk.gray(this.getTimestamp())} ${this.getPrefix()} ${chalk.yellowBright(message)} ${this.getStatsString()}`
        );
    }

    public debug(message: string): void {
        console.log(`${chalk.gray(this.getTimestamp())} ${this.getPrefix()} ${chalk.gray.italic(message)}`);
    }

    public header(message: string): void {
        console.log(chalk.bold.magentaBright(`\n${message}`));
    }

    public incrementComments(): void {
        this.comments++;
    }
}