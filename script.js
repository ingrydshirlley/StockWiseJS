// Seletores do DOM
const video = document.getElementById("video");
const output = document.getElementById("output");
const locationDisplay = document.getElementById("location");

// cache de produtos
const cacheProdutos = {};

// obter nossa localização
async function obterLocalizacao() {
    try {
        let response = await fetch("https://ipinfo.io/json?token=063ca95dd8b1ae");
        if (response.ok) {
            let data = await response.json();
            return `${data.city}, ${data.region}, ${data.country}`;
        }
    } catch (error) {
        console.error("Erro ao obter localização:", error);
    }
    return "Localização não disponível";
}

// buscar informações do produto na API
async function buscarProdutoApi(barcode) {
    if (cacheProdutos[barcode]) {
        return cacheProdutos[barcode];
    }

    try {
        let response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        if (response.ok) {
            let data = await response.json();
            if (data.product) {
                let produtoInfo = data.product;
                let nome = produtoInfo.product_name || "Nome não disponível";
                let marca = produtoInfo.brands || "Marca desconhecida";
                let quantidade = produtoInfo.quantity || "Quantidade não informada";
                let paisOrigem = produtoInfo.countries ? produtoInfo.countries.replace("en:", "") : "País de origem não disponível";


                let detalhes = `${nome} - ${marca}\nPeso: ${quantidade}\nOrigem: ${paisOrigem}`;
                cacheProdutos[barcode] = detalhes;
                return detalhes;
            }
        }
    } catch (error) {
        console.error("Erro ao buscar produto:", error);
    }
    return "Produto não encontrado";
}

// inicializa a câmera ANTES do QuaggaJS
async function iniciarCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
    } catch (error) {
        console.error("Erro ao acessar a câmera:", error);
    }
}

// inicializa o QuaggaJS depois de garantir que a câmera tá rodando
async function iniciarScanner() {
    let localizacao = await obterLocalizacao();
    locationDisplay.innerText = `Localização: ${localizacao}`;

    Quagga.init(
        {
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: video, // vídeo já iniciado
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment"
                }
            },
            decoder: {
                readers: ["ean_reader", "code_128_reader"]
            }
        },
        (err) => {
            if (err) {
                console.error("Erro ao iniciar QuaggaJS:", err);
                return;
            }
            console.log("QuaggaJS iniciado com sucesso!");
            Quagga.start();
        }
    );

    Quagga.onDetected(async (data) => {
        let barcode = data.codeResult.code;
        output.innerText = `Código: ${barcode}\nBuscando informações...`;
    
        document.querySelector(".video-container").classList.add("scanning");
    
        let detalhes = await buscarProdutoApi(barcode);
        output.innerText = `Código: ${barcode}\n${detalhes}`;
    
        setTimeout(() => {
            document.querySelector(".video-container").classList.remove("scanning");
        }, 2000);
    
        Quagga.stop();
        setTimeout(() => Quagga.start(), 3000);
    });
    
}

// Chama as funções na ordem
document.addEventListener("DOMContentLoaded", async () => {
    await iniciarCamera(); // garante que a câmera aparece
    iniciarScanner(); // inicia o scanner depois
});
