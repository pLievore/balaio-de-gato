# Variáveis de ambiente

Este arquivo descreve o ambiente alvo da Balaio de Gato. Nunca versione segredos; use `.env.local` somente para desenvolvimento e o cofre do provedor nos demais ambientes.

## Base pública

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ALLOW_INDEXING=false
```

`NEXT_PUBLIC_ALLOW_INDEXING` só deve ser `true` no domínio público final.

## PostgreSQL e dados protegidos

```dotenv
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
ORDER_DATA_ENCRYPTION_KEY=...
ORDER_RESERVATION_TTL_MINUTES=1440
```

- `DATABASE_URL` é a conexão pooled usada pelo Next.js em runtime.
- `DATABASE_URL_UNPOOLED` é a conexão direta preferida por migrations, seed e
  ferramentas do Drizzle.
- `ORDER_DATA_ENCRYPTION_KEY` protege o CPF persistido e gera o índice cego de
  consulta. É **obrigatória em todo deploy** e deve ser longa, aleatória,
  exclusiva por ambiente e mantida no cofre do provedor. Trocar esse segredo
  sem um plano de rotação torna os dados existentes ilegíveis.
- `ORDER_RESERVATION_TTL_MINUTES` define, em minutos inteiros positivos, a
  validade inicial da reserva de estoque. É obrigatório em produção; `1440` é
  apenas um exemplo e deve ser calibrado com a operação Personal Net.

O fallback local temporário que deriva a proteção de dados de
`ADMIN_PANEL_SESSION_SECRET` é apenas uma compatibilidade de desenvolvimento e
não é uma configuração de deploy suportada. Defina sempre a chave dedicada
fora do ambiente local.

## Sessão administrativa

```dotenv
ADMIN_PANEL_PASSWORD=...
ADMIN_PANEL_SESSION_SECRET=...
```

O painel `/admin` deste app roda sobre o PostgreSQL do projeto e é protegido
por senha única, com sessão em cookie assinado por HMAC
(`src/lib/panel/session.ts`). `ADMIN_PANEL_PASSWORD` precisa de ao menos 8
caracteres e `ADMIN_PANEL_SESSION_SECRET` de ao menos 32. Segredos
administrativos devem ter alta entropia e ser diferentes por ambiente.

Uma senha única não distingue quem operou. As tabelas de papéis
(`admin_users`, `admin_role`) já existem no esquema para uma autenticação por
pessoa, que ainda não foi implementada.

## Gate de manutenção

```dotenv
MAINTENANCE_MODE=
MAINTENANCE_BYPASS_TOKEN=...
```

`MAINTENANCE_MODE` com `1`, `true` ou `on` faz `proxy.ts` servir a página de
manutenção com HTTP 503 em toda rota pública. É lido no build: virar a chave
exige novo deploy. `?preview=<MAINTENANCE_BYPASS_TOKEN>` destrava o site e
grava um cookie, para o operador conferir a loja com o portão ligado. Sem
token configurado, o desvio simplesmente não existe.

## Comunicação

```dotenv
RESEND_API_KEY=...
EMAIL_FROM=...
EMAIL_REPLY_TO=...
```

`src/lib/email/client.ts` fala com a Resend por HTTP puro. Sem
`RESEND_API_KEY` e `EMAIL_FROM` o envio devolve `skipped` e a interface deixa
de prometer e-mail ao cliente — o pedido nunca falha porque o e-mail falhou.
`EMAIL_REPLY_TO` é opcional. Remetente e domínio precisam ser verificados na
Resend antes da ativação.

## Personal Net / DUEPAY

O fluxo inicial não requer credencial de API porque é assistido no portal autorizado. Não crie variáveis falsas. Se a Personal Net fornecer uma API vigente, as variáveis serão definidas conforme a documentação oficial, separando sandbox e produção.

## Legado em remoção

As variáveis `SHOPIFY_*`, `SQUARE_*`, `SUPABASE_*` e `NEXT_PUBLIC_PHONE_E164` foram removidas do projeto e do ambiente da Vercel junto com o código que as lia. Não recrie nenhuma delas.

`RESEND_API_KEY` e `EMAIL_FROM` também constavam aqui, mas **voltaram a valer**: o módulo de e-mail transacional foi reescrito sobre a Resend e lê exatamente essas duas. Veja "Comunicação".

## Ambiente atual

O deploy usa exatamente estas variáveis:

```dotenv
DATABASE_URL=postgresql://...        # Neon, pooled, usado no runtime
DATABASE_URL_UNPOOLED=postgresql://...# conexão direta, para migrations e seed
NEXT_PUBLIC_SITE_URL=https://...
NEXT_PUBLIC_ALLOW_INDEXING=false     # `true` só no domínio público final
ORDER_DATA_ENCRYPTION_KEY=...        # ≥32 bytes; cifra o CPF do responsável
ORDER_RESERVATION_TTL_MINUTES=...
ADMIN_PANEL_PASSWORD=...             # acesso ao painel
ADMIN_PANEL_SESSION_SECRET=...       # ≥32 bytes, assina o cookie de sessão
ALLOW_DEVELOPMENT_CATALOG=true       # temporária: serve o catálogo de seed
BLOB_READ_WRITE_TOKEN=...            # fotos de produto; a Vercel injeta ao ligar o store
MAINTENANCE_MODE=                    # 1/true/on serve 503 no storefront inteiro
MAINTENANCE_BYPASS_TOKEN=...         # ?preview=<token> destrava com o portão ligado
RESEND_API_KEY=...                   # sem ela o e-mail é `skipped`, não falha
EMAIL_FROM=...                       # remetente verificado na Resend
EMAIL_REPLY_TO=...                   # opcional
```

Essa lista é a mesma do `env.example`, que serve de modelo para o `.env.local`.

`ORDER_DATA_ENCRYPTION_KEY` é obrigatória em produção — sem ela o envio do
pedido lança exceção, e trocá-la torna ilegíveis os CPFs já cifrados.

A coleta de eventos do funil **não tem variável**: ela grava na tabela
`funnel_counters` do próprio PostgreSQL. Antes dependia de um Redis Upstash
(`KV_REST_API_*` / `UPSTASH_REDIS_REST_*`) que nunca foi provisionado, e por
isso ficava inerte. Não recrie essas variáveis.

`ALLOW_DEVELOPMENT_CATALOG` é um andaime: enquanto o catálogo do banco for o
seed `draft`, sem ela a loja mostra zero produtos. Ela sai quando o catálogo
oficial for publicado.
