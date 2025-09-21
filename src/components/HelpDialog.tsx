
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from './ui/button';
import { HelpCircle, X } from 'lucide-react';

interface HelpDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onOpenChange }) => {
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-full h-14 w-14 shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => onOpenChange(true)}
      >
        <HelpCircle className="h-7 w-7" />
      </Button>

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-bold">Ajuda - GeoFlightPlannerCamp</DialogTitle>
            <DialogDescription>
              Guia rápido para edição de planos de voo.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="prose prose-sm lg:prose-base max-w-none text-foreground">
              <h2 className="text-xl font-semibold mt-4">Qual o objetivo do App?</h2>
              <p>
                Facilitar a edição de campos dos arquivos .CSV gerados pelo plugin <strong>GeoFlightPlanner</strong> no QGIS. Esta ferramenta é ideal para quem precisa fazer ajustes finos no plano de voo diretamente em campo, de forma offline, usando um smartphone ou tablet.
              </p>

              <h2 className="text-xl font-semibold mt-4">Como Usar as Ferramentas?</h2>
              
              <h3 className="text-lg font-semibold mt-3">Gerenciamento de Arquivos</h3>
              <ul>
                <li><strong>Importar CSV:</strong> Carregue seu arquivo .CSV. O app tentará detectar as colunas de coordenadas (latitude, longitude, altitude). Se não conseguir, você poderá mapeá-las manualmente.</li>
                <li><strong>Exportar CSV:</strong> Gera um novo arquivo .CSV com suas edições, mantendo o formato e cabeçalho originais, pronto para ser usado no Litchi.</li>
                <li><strong>Desfazer/Refazer:</strong> Volte ou avance uma ação de edição a qualquer momento.</li>
              </ul>

              <h3 className="text-lg font-semibold mt-3">Visualização</h3>
              <ul>
                <li><strong>Zoom:</strong> Use os botões de zoom para aproximar, afastar, enquadrar todos os pontos ou focar apenas nos pontos selecionados.</li>
              </ul>

              <h3 className="text-lg font-semibold mt-3">Seleção</h3>
              <p>Feições selecionadas ficam destacadas em laranja. Apenas com pontos selecionados as ferramentas de edição são habilitadas.</p>
              <ul>
                <li><strong>Seleção Única:</strong> Toque em um ponto no mapa para selecioná-lo.</li>
                <li><strong>Seleção por Polígono:</strong> Desenhe uma área no mapa para selecionar todos os pontos dentro dela. Finalize o desenho com o botão que aparece na tela ou com o clique direito no PC.</li>
                <li><strong>Selecionar Tudo:</strong> Um botão que alterna entre selecionar e deselecionar todos os pontos do mapa.</li>
                <li><strong>Limpar Seleção:</strong> Remove a seleção de todos os pontos.</li>
              </ul>

              <h3 className="text-lg font-semibold mt-3">Edição</h3>
              <ul>
                <li><strong>Duplicar:</strong> Cria uma cópia dos pontos selecionados.</li>
                <li><strong>Mover (Translação):</strong> Arraste os pontos selecionados no mapa ou edite os valores de delta (dLat, dLon, dAlt) no painel de atributos. Para alterar a altitude arrastando no mapa, trave um dos eixos (latitude ou longitude).</li>
                <li><strong>Editar Atributos:</strong> Edite os valores de qualquer campo para todos os pontos selecionados de uma só vez. Deixe um campo em branco para manter os valores originais.</li>
                <li><strong>Excluir:</strong> Remove permanentemente os pontos selecionados.</li>
              </ul>

              <h2 className="text-xl font-semibold mt-4">Layout da Tela</h2>
              <p>
                Use o botão de troca de layout para alternar entre as visualizações: tela dividida (mapa e atributos), somente mapa ou somente atributos. Na tela dividida, você pode arrastar a divisória para redimensionar os painéis.
              </p>
            </div>
          </ScrollArea>
          
          <div className="p-6 border-t flex justify-between items-center">
             <a href="https://www.portal.geoone.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                Visite a GeoOne
              </a>
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
};

export default HelpDialog;
