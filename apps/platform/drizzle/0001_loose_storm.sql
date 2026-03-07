CREATE TABLE `curvas_abrams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipoCimento` varchar(100),
	`idade` int NOT NULL,
	`pontos` json,
	`k1` decimal(10,4) NOT NULL,
	`k2` decimal(10,4) NOT NULL,
	`r2` decimal(6,4),
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curvas_abrams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ensaios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tracoId` int,
	`nome` varchar(255) NOT NULL,
	`dataEnsaio` timestamp NOT NULL,
	`resultados` json,
	`k1` decimal(10,4),
	`k2` decimal(10,4),
	`r2` decimal(6,4),
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ensaios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historico_custos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tracoId` int,
	`data` timestamp NOT NULL,
	`custoM3` decimal(10,2) NOT NULL,
	`detalhes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historico_custos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materiais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipo` enum('cimento','areia','brita','filler_reativo','filler_inerte','aditivo','fibra','pigmento','agua') NOT NULL,
	`fornecedor` varchar(255),
	`densidade` decimal(6,3) NOT NULL,
	`custoUnitario` decimal(10,2),
	`custoFrete` decimal(10,2),
	`embalagem` varchar(100),
	`qtdEmbalagem` decimal(10,2),
	`moduloFinura` decimal(4,2),
	`dmaxCaract` decimal(6,2),
	`blaine` int,
	`bet` decimal(8,2),
	`malhaRetencao` varchar(50),
	`teorSolidos` decimal(5,2),
	`teorAgua` decimal(5,2),
	`granulometria` json,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materiais_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`tipoConcreto` enum('convencional','caa','hpc','uhpc','grc','colorido','leve','bloco','paver','arquitetonico') NOT NULL,
	`fckAlvo` int,
	`slumpAlvo` int,
	`flowAlvo` int,
	`teorArgamassa` decimal(5,2),
	`relacaoAC` decimal(4,3),
	`teorArIncorporado` decimal(4,2),
	`composicao` json,
	`consumoCimento` decimal(8,2),
	`custoM3` decimal(10,2),
	`massaEspecifica` decimal(8,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tracos_id` PRIMARY KEY(`id`)
);
