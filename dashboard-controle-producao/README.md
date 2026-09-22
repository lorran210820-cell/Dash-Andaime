# Dashboard Controle de Produção

Dashboard estático e responsivo criado a partir de `Controle de Produção.xlsx`. Não usa banco de dados nem servidor: os registros estão consolidados em `data/production.json`.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie **o conteúdo desta pasta** para a raiz do repositório.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main`, pasta `/ (root)` e clique em **Save**.

Após alguns minutos, o dashboard estará disponível no endereço indicado pelo GitHub.

## Abrir localmente no VS Code

Use a extensão **Live Server** e abra `index.html` por ela. O navegador bloqueia o carregamento de arquivos JSON quando o HTML é aberto diretamente por `file://`.

## Atualizar os dados

O arquivo `data/production.json` contém os registros usados pelo painel. Na próxima etapa, podemos criar um importador para transformar novas versões do Excel automaticamente.

## Estrutura

- `index.html`: estrutura do dashboard
- `styles.css`: identidade visual e responsividade
- `app.js`: filtros, indicadores, gráficos, ranking, paginação e exportação CSV
- `data/production.json`: base estática extraída do Excel
- `.nojekyll`: evita processamento desnecessário pelo Jekyll

Os gráficos usam Chart.js via CDN e as fontes usam Google Fonts.
