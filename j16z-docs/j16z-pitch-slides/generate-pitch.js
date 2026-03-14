const pptxgen = require('pptxgenjs');
const { html2pptx } = require('./html2pptx');

async function createJ16zPitch() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'j16z';
  pptx.title = "j16z - The Deal Desk's Operating System";

  // Slide 1: Cover
  await html2pptx('slide-01-cover.html', pptx);

  // Slide 2: Problem
  await html2pptx('slide-02-problem.html', pptx);

  // Slide 3: Insight
  await html2pptx('slide-03-insight.html', pptx);

  // Slide 4: Solution
  await html2pptx('slide-04-solution.html', pptx);

  // Slide 5: Market Opportunity with Chart
  const { slide: slide5, placeholders: ph5 } = await html2pptx('slide-05-market.html', pptx);

  // Add market growth chart
  const marketData = [
    {
      name: 'M&A Deal Volume',
      labels: ['2022', '2023', '2024', '2025', '2026E'],
      values: [3.9, 3.2, 2.9, 3.6, 4.3],
    },
  ];

  slide5.addChart(pptx.charts.LINE, marketData, {
    ...ph5[0],
    lineSize: 4,
    lineSmooth: true,
    showCatAxisTitle: true,
    catAxisTitle: 'Year',
    showValAxisTitle: true,
    valAxisTitle: 'Deal Volume ($T)',
    valAxisMinVal: 0,
    valAxisMaxVal: 5,
    valAxisMajorUnit: 1,
    chartColors: ['2E5CFF'],
    lineDataSymbol: 'circle',
    lineDataSymbolSize: 8,
    showLegend: false,
    fill: '0A0A0A',
    catAxisLabelColor: 'A0A0A0',
    valAxisLabelColor: 'A0A0A0',
    catAxisTitleColor: 'A0A0A0',
    valAxisTitleColor: 'A0A0A0',
    titleColor: 'FFFFFF',
    dataLabelColor: 'FFFFFF',
    dataLabelPosition: 't',
  });

  // Slide 6: Competitive Landscape
  await html2pptx('slide-06-competitive.html', pptx);

  // Slide 7: Business Model
  await html2pptx('slide-07-business-model.html', pptx);

  // Save presentation
  await pptx.writeFile({ fileName: '../j16z_Pitch_Deck_Final.pptx' });
  console.log('✓ j16z pitch deck created successfully!');
}

createJ16zPitch().catch(console.error);
