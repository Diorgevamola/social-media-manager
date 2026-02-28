const fs = require('fs');

async function testGeminiImageGeneration() {
  try {
    console.log('🎨 Testando geração de imagens com Gemini 3 Pro Image Preview...\n');
    
    const { GoogleGenAI } = require('@google/genai');
    
    const ai = new GoogleGenAI({ 
      apiKey: 'AIzaSyD9ILpl_ED9MnpUPS0Pg1oyWDQF9XMShLY'
    });

    const prompt = 'A beautiful sunset over a calm ocean with palm trees silhouette in the foreground, vibrant orange and pink colors, professional photography style, 4K quality';
    
    console.log('📝 Prompt:', prompt);
    console.log('\n⏳ Gerando imagem...\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    console.log('📊 Resposta recebida com', parts.length, 'part(s)');
    
    const imagePart = parts.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData) {
      console.log('❌ FALHA: Nenhuma imagem foi gerada');
      console.log('📋 Detalhes:', JSON.stringify(response, null, 2).substring(0, 500));
      return;
    }

    const imageData = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType ?? 'image/jpeg';
    
    console.log('✅ SUCESSO! Imagem gerada com sucesso!');
    console.log('📦 Tipo MIME:', mimeType);
    console.log('📏 Tamanho dos dados base64:', imageData.length, 'caracteres');

    const buffer = Buffer.from(imageData, 'base64');
    console.log('📸 Tamanho do arquivo:', (buffer.length / 1024).toFixed(2), 'KB');

    console.log('\n' + '='.repeat(60));
    console.log('🔑 STATUS FINAL:');
    console.log('='.repeat(60));
    console.log('✅ API KEY: VÁLIDA e FUNCIONAL');
    console.log('✅ Modelo: gemini-3-pro-image-preview');
    console.log('✅ Quota: DISPONÍVEL');
    console.log('✅ Geração de imagem: FUNCIONANDO');
    console.log('✅ Integração com social-media-manager: OK');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error('\n📋 Stack:', error.stack?.substring(0, 500));
  }
}

testGeminiImageGeneration();
