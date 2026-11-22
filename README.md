# Ficha de Personagem D&D 3.5 – Monge Épico

Este repositório contém um único arquivo **`character-sheet.html`** que implementa uma ficha de personagem interativa totalmente offline.

## Como usar
1. Abra o arquivo **`character-sheet.html`** em qualquer navegador moderno (Chrome, Edge, Firefox, etc.).
2. A ficha já carrega em modo **escuro** por padrão; use o botão da barra superior para alternar entre modo claro/escuro.
3. Todas as alterações (atributos, pontos de vida, habilidades, etc.) são salvas automaticamente em `localStorage`.  Ao fechar ou recarregar a página, os dados permanecem.
4. Para exportar o estado atual, clique em **Exportar JSON**; um arquivo será baixado contendo todos os valores.
5. Para importar um estado salvo, pressione **Importar JSON** e selecione o arquivo JSON correspondente.
6. Use os botões de `+`/`-` ao lado dos atributos e habilidades para ajustar os valores ou clique nos campos para edição direta.
7. O histórico de dano/curativo pode ser aberto/fechado pelo botão **Histórico de HP**.
8. As seções de **Talentos, Perícias e Magias** são exibidas como accordions; clique para abrir detalhes.
9. Caso deseje redefinir tudo, abra as ferramentas de desenvolvedor e execute `localStorage.clear(); location.reload();`.

## Estrutura do projeto
- `character-sheet.html` – arquivo único contendo HTML, CSS e JavaScript embutidos.
- `README.md` – este documento.

## Customização
Para adicionar novas habilidades, talentos ou magias, edite o bloco JSON dentro do script (variáveis `skillsData` e `featsData`).  Após salvar, atualize a página para que as novas entradas apareçam.

---
*Gerado por Antigravity (AGY) – versão 2026.*