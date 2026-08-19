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
ADMIN_PANEL_SESSION_SECRET=...
```

Esse segredo ainda sustenta o painel legado enquanto ele permanece no código.
O novo painel terá autenticação e autorização próprias; não considere a sessão
atual como migração concluída. Segredos administrativos devem ter alta entropia
e ser diferentes por ambiente.

## Comunicação — pendente de fornecedor

```dotenv
TRANSACTIONAL_EMAIL_FROM=...
TRANSACTIONAL_EMAIL_PROVIDER_KEY=...
```

Remetente, domínio e fornecedor precisam ser validados antes da ativação.

## Personal Net / DUEPAY

O fluxo inicial não requer credencial de API porque é assistido no portal autorizado. Não crie variáveis falsas. Se a Personal Net fornecer uma API vigente, as variáveis serão definidas conforme a documentação oficial, separando sandbox e produção.

## Legado em remoção

Variáveis `SHOPIFY_*`, `SQUARE_*`, `SUPABASE_*`, contatos e endereços da 801 Outlet não pertencem ao ambiente alvo. Elas podem continuar presentes localmente enquanto módulos antigos ainda compilam, mas não devem ser copiadas para a nova infraestrutura nem usadas nas rotas públicas novas.
