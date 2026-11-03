# Site de Fotografia

Portefólio, entrega de galerias a clientes e arquivo das fotografias, tudo no teu próprio site.
Corre na Cloudflare (Pages + R2).

## Custos (para ~100 GB de fotos)

| Item | Preço |
|---|---|
| Alojamento do site (Cloudflare Pages) | Grátis |
| Armazenamento R2: primeiros 10 GB | Grátis |
| Armazenamento R2: cada GB acima de 10 | 0,015 $/mês, ou seja 100 GB ≈ **1,35 $/mês** |
| Tráfego: visitas e downloads dos clientes | **Grátis e sem limite** |
| Domínio `.pt` ou `.com` | ~10–15 €/ano |

Os downloads não aumentam a fatura. As fotos são servidas diretamente pela rede da Cloudflare através de um endereço secreto por galeria. Não passam pelo servidor, por isso não contam para o limite de pedidos.

## O que faz

**Site público**
- Página inicial com fotografia em ecrã inteiro e o nome em destaque. Escolhes a imagem no painel.
- Página de eventos: grelha de ponta a ponta com o título por cima e pesquisa (também aceita o código de uma galeria privada).
- Página "Sobre" com os contactos e um botão de pedido de orçamento.
- Galerias de cliente em `teusite.pt/g/nome`:
  - palavra-passe e data de expiração
  - favoritas (♥) e legendas
  - "Descarregar todas" num ZIP: no Chrome e no Edge sem limite de tamanho, no Safari e no Firefox uma a uma
  - proteção contra clique direito

**Painel `/admin` (ao estilo do SmugMug)**
- Barra lateral com pastas e galerias. Arrasta uma galeria para uma pasta para a organizar.
- Grelha de fotos com tamanho ajustável e seleção múltipla:
  - clique, Shift+clique, Ctrl/⌘+clique
  - Ctrl+A para selecionar tudo, Delete para apagar
- Arrasta as fotos para as reordenar, ou para outra galeria na barra lateral para as mover.
- Ações sobre as fotos selecionadas: definir capa, mover, descarregar, apagar.
- Painel de detalhes com pré-visualização, dimensões, tamanho, legenda e se o cliente a marcou como favorita.
- Fila de envio com progresso por foto. Arrasta fotos do computador diretamente para a grelha.
- Definições por separadores: Geral · Acesso e privacidade · Cliente · Avançado.
- Partilhar: mensagem pronta com o link e a palavra-passe, para copiar ou enviar por WhatsApp ou email.
- "Copiar nomes das favoritas", para colar no Lightroom e filtrar a seleção do cliente.
- Espaço usado e custo estimado, sempre à vista.

## Pôr online (uma vez, ~20 minutos)

1. Cria uma conta grátis em https://dash.cloudflare.com/sign-up
2. No painel da Cloudflare abre **R2 Object Storage** e ativa-o. Pede cartão, mas só cobra acima dos 10 GB.
3. Instala o [Node.js](https://nodejs.org) no teu computador e, num terminal dentro desta pasta, corre:

```bash
npm install
```

```bash
npx wrangler login
```

```bash
npx wrangler r2 bucket create fotografia
```

```bash
npx wrangler r2 bucket create fotografia-dados
```

```bash
npx wrangler pages project create fotografia --production-branch main
```

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name fotografia
```

```bash
npx wrangler pages secret put SESSION_SECRET --project-name fotografia
```

```bash
npx wrangler pages deploy
```

- `ADMIN_PASSWORD`: a tua palavra-passe do painel. Usa uma longa.
- `SESSION_SECRET`: um texto aleatório comprido (40+ letras e números ao calhas). Não precisas de o decorar.

4. Abre `https://fotografia.pages.dev/admin` e entra.

### Domínio e tráfego ilimitado (importante)

1. Compra o domínio (por exemplo `teunome.pt`) e adiciona-o à Cloudflare: **Add a domain**. Depois muda os nameservers no sítio onde o compraste.
2. **Workers & Pages → fotografia → Custom domains → Set up a domain** → `teunome.pt`
3. **R2 → fotografia → Settings → Public access → Custom Domains → Connect domain** → `fotos.teunome.pt`
   - Só o bucket `fotografia` fica público. O `fotografia-dados` (palavras-passe, favoritas) **nunca** deve ser público.
4. Em `wrangler.toml`, muda para `PUBLIC_BASE = "https://fotos.teunome.pt"` e publica outra vez:

```bash
npx wrangler pages deploy
```

O aviso amarelo no painel desaparece quando isto estiver feito.

## Como usar

- **Portefólio**: Nova galeria → Portefólio → arrasta as fotos. Aparece logo na página inicial.
- **Cliente**: Nova galeria → Galeria de cliente. A palavra-passe é gerada sozinha. Arrasta as fotos e depois usa **Partilhar** para enviar a mensagem.
- A palavra-passe é guardada encriptada. Se a perderes, gera uma nova em Partilhar.

## Limites

- Formatos aceites: JPG, PNG e WebP, até 95 MB por ficheiro. RAW e HEIC não entram: exporta primeiro do Lightroom em JPG.
- Quem tiver o endereço direto de uma foto consegue abri-la. Esse endereço só é revelado depois da palavra-passe, e é como funcionam o SmugMug e o Pixieset.
