import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: true,
    theme: 'neutral',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif',
});

interface VisualWorkflowProps {
    chart: string;
    id?: string;
}

export const VisualWorkflow: React.FC<VisualWorkflowProps> = ({ chart, id = 'mermaid-chart' }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const renderChart = async () => {
            if (containerRef.current && chart) {
                try {
                    containerRef.current.innerHTML = '';
                    const { svg } = await mermaid.render(id, chart);
                    containerRef.current.innerHTML = svg;
                } catch (error) {
                    console.error('Mermaid render error:', error);
                    containerRef.current.innerHTML = '<div class="text-red-500 text-sm">Logic visualization error</div>';
                }
            }
        };

        renderChart();
    }, [chart, id]);

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 overflow-x-auto">
            <div ref={containerRef} />
        </div>
    );
};
