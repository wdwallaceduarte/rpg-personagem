import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "O Santo · Ficha de Personagem D&D 3.5" },
    { name: "description", content: "Ficha D&D 3.5 em português com atributos reativos, classe de armadura, resistências, pontos de vida e salvamento automático offline." },
    { property: "og:title", content: "O Santo · Ficha de Personagem D&D 3.5" },
    { property: "og:description", content: "Sua crônica D&D 3.5: atributos, defesas e histórico de combate em uma ficha independente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  return <iframe className="character-sheet-frame" src="/character-sheet.html" title="Ficha de personagem D&D 3.5" />;
}
