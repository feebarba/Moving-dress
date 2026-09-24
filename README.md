# Moving-dress — Fitas Flexíveis

Arte generativa em p5.js. O projeto é uma página estática responsiva, preparada para prévia local e, depois, incorporação num site por iframe.

## Prévia local

Na pasta do projeto, execute:

```sh
python3 -m http.server 4176 --bind 127.0.0.1
```

Abra **http://127.0.0.1:4176/**. O navegador recarrega automaticamente quando `index.html`, `styles.css` ou `sketch.js` muda. Essa é a URL de desenvolvimento; não é necessário abrir `file://` nem instalar pacotes.

## Controles

O painel altera intensidade e velocidade do vento (0–300%), flexibilidade, número de fitas (10–80), direção de **Start** e **End**, largura do Start e cor do fundo. Start é a ponta ajustável do funil; End é a abertura final. Cada seletor oferece Top, Left, Right e Bottom, permitindo percursos verticais, horizontais ou diagonais. Se Start e End forem colocados na mesma borda, o outro seletor passa para a borda oposta. **Vento aleatório** vem ligado e cria rajadas irregulares e suaves; desligá-lo recupera o movimento cíclico. A velocidade continua ajustável nos dois modos. A largura do Start vai de 0% (fitas reunidas na borda inicial) a 100% (abertura original). **Fins aleatórios** distribui o fim de cada fita entre o meio do viewport e o comprimento original. Os fins permanecem estáveis durante o movimento e são sorteados novamente ao religar o toggle. Ao ativar essa opção, aparece **Largura no End**: 0% afunila a fita até uma ponta e 100% mantém sua largura original no fim. Com Fins aleatórios desligado, as fitas conservam o comprimento e a largura originais no End. Cada ponta possui uma inclinação e uma borda suavemente curva que reagem ao vento; o movimento acompanha as fitas em qualquer direção Start → End.

**Cores das fitas** oferece quatro círculos para definir cores próprias. O padrão é `#FFFFFF`, `#862C0E`, `#F83F77` e `#E7C1CE`, nessa ordem, sobre fundo `#FFFFFF`. O seletor **Ativas** permite usar de uma a quatro cores; elas são distribuídas em sequência pelas fitas. **Aleatório** embaralha essa distribuição sem alterar as cores a cada quadro. As fitas usam maior opacidade para mostrar as cores com mais força. A quantidade ativa e o modo aleatório são guardados no navegador quando o armazenamento local está disponível. As cores escolhidas durante a sessão voltam ao padrão ao recarregar a página.

**Texto nas fitas** aceita uma frase com no mínimo 20 palavras. A contagem aparece no painel; abaixo desse limite o texto é ocultado. A frase se repete com intervalo curto e percorre continuamente cada fita no sentido de Start para End, acompanhando as curvas. **Velocidade do texto** vai de 0% (parado) a 300%; 100% mantém a velocidade anterior. O texto usa IBM Plex Mono Regular 12 px do Google Fonts, com preto `#000000` como cor padrão, ajustável em **Cor do texto**. O texto digitado é guardado no navegador quando o armazenamento local está disponível; sua cor volta ao padrão ao recarregar a página.

Para manter a animação leve, a frase é desenhada numa imagem fora da tela quando o texto, a cor ou a fonte muda. A cada quadro, pequenos trechos dessa imagem são colocados sobre a curva de cada fita. Em telas de alta resolução, a densidade do canvas é limitada a 1,5×.

Arraste a barra superior para mover o painel pelo viewport; quando minimizado, arraste o botão **+**. O painel permanece dentro das bordas da janela, inclusive após redimensioná-la. O botão **−** minimiza o painel e **+** o reabre. **Salvar imagem** exporta o canvas em PNG com a cor de fundo escolhida. Mover ou arrastar o mouse sobre as fitas produz uma rajada.

## Estrutura

- `index.html`: página completa para navegador e iframe.
- `sketch.js`: animação e interação em p5.js.
- `styles.css`: painel e canvas em tela cheia.
- `vendor/p5.min.js`: biblioteca local, sem dependência de CDN.
- `dev-reload.js`: recarga automática da prévia local; a verificação de alterações só roda em `localhost` ou `127.0.0.1`.

Para usar em um iframe público, hospede os arquivos estáticos por GitHub Pages ou outro serviço. O iframe deverá apontar para a URL publicada; `127.0.0.1` funciona apenas no computador onde o servidor está rodando.

## Licença

O código deste projeto está sob a [licença MIT](LICENSE). O p5.js incluído em `vendor/` mantém sua própria licença, documentada em [THIRD-PARTY.md](THIRD-PARTY.md).
