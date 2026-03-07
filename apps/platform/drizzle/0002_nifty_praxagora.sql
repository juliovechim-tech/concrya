CREATE TABLE `historico_licencas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licencaId` int NOT NULL,
	`userId` int NOT NULL,
	`acao` enum('criada','renovada','cancelada','suspensa','reativada','alterada') NOT NULL,
	`detalhes` text,
	`realizadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historico_licencas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `licencas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tipo` enum('mensal','anual','vitalicia','trial') NOT NULL,
	`status` enum('ativa','expirada','cancelada','suspensa') NOT NULL DEFAULT 'ativa',
	`dataInicio` timestamp NOT NULL DEFAULT (now()),
	`dataExpiracao` timestamp,
	`nivel` enum('basico','tecnico','avancado','cientifico','completo') NOT NULL DEFAULT 'basico',
	`observacoes` text,
	`criadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `licencas_id` PRIMARY KEY(`id`),
	CONSTRAINT `licencas_userId_unique` UNIQUE(`userId`)
);
