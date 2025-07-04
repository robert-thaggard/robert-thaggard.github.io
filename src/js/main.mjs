
export default class ForeCalc {

    constructor(containerSelector) {
        const formElement = document.querySelector(containerSelector);
        if (!formElement) {
            throw new Error(`Container element not found for selector: ${containerSelector}`);
        }

        formElement.addEventListener("submit", (event) => {
            event.preventDefault();

            const productLink = document.querySelector("#product-link")?.value;
            if (!productLink) {
                throw new Error('Product link input not found or empty.');
            }

            const resultsElement = document.getElementById('results');
            if(!resultsElement) {
                throw new Error('Results element not found.');
            }

            this.hideResults();
            try {
                this.calculate(productLink).then(results => {
                    if(!results){
                        return;
                    }

                    this.displayResults(`It would take approximately ${results.foreskinCount} foreskins to cover your ${results.productName}. Wow!`);
                    resultsElement.classList.remove('hide');
                });
            } catch(error) {
                this.hideOverlay();
                this.displayResults(error.message);
            }
            
        });
    }

    displayOverlay() {
        const overlayElement = document.getElementById('overlay');
        if(!overlayElement) {
            throw new Error('Overlay element not found.');
        }

        overlayElement.classList.remove('hide');
    }

    hideOverlay() {
        const overlayElement = document.getElementById('overlay');
        if(!overlayElement) {
            throw new Error('Overlay element not found.');
        }

        overlayElement.classList.add('hide');
    }

    displayResults(text) {
        const resultsElement = document.getElementById('results');
        if(!resultsElement) {
            throw new Error('Results element not found.');
        }

        resultsElement.querySelector('p').textContent = text;
        resultsElement.classList.remove('hide');
    }

    hideResults() {
        const resultsElement = document.getElementById('results');
        if(!resultsElement) {
            throw new Error('Results element not found.');
        }

        resultsElement.classList.add('hide');
    }

    async calculate(url) {
        document.getElementById('overlay').classList.remove('hide');

        const asin = this.getASIN(url);
        if (!asin) {
            document.getElementById('overlay').classList.add('hide');
            throw new Error('ASIN not found in the provided URL.');
        }

        const averageForeskinSurfaceArea = 15;
        const productInfo = await this.getProductSurfaceArea(asin);
        if(!productInfo) {
            throw new Error('Could not determine product surface area.');
        }
        
        document.getElementById('overlay').classList.add('hide');

        return {
            foreskinCount: Math.round(productInfo.surfaceArea / averageForeskinSurfaceArea),
            productName: productInfo.productName,
        }
    }

    getASIN(url) {
        const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
        if (dpMatch) {
            return dpMatch[1];
        }

        const urlObj = new URL(url);
        const asin = urlObj.searchParams.get('pd_rd_i');
        if (asin) {
            return asin;
        }

        return null;
    }

    async getProductInfo(asin) {
        const apiKey = '6EFA69A9983142EEA1DB1E7C899B0999';
        const url = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&amazon_domain=amazon.ca&asin=${asin}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            const specifications = data.product?.specifications || [];
            let dimensions = null;

            for (const spec of specifications) {
                if (spec.name.toLowerCase().includes('dimensions')) {
                    dimensions = spec.value;
                    break;
                }
            }

            if (!dimensions && data.product?.details) {
                for (const detail of data.product.details) {
                    if (detail.name.toLowerCase().includes('dimensions')) {
                        dimensions = detail.value;
                        break;
                    }
                }
            }

            if(!dimensions) {
                throw new Error('Dimensions not found in product data.');
            }

            console.log('Raw dimensions:', dimensions);

            return {
                dimensions,
                titleExcludingVariant: data.product?.title_excluding_variant_name || data?.product?.title || null,
            };

        } catch (error) {
            this.hideOverlay();
            this.displayResults(error.message);
        }
    }

    parseDimensions(dimensionsString) {
        const match = dimensionsString.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/i);
        if (!match) {
            console.error('Could not parse dimensions:', dimensionsString);
            return null;
        }

        let length = parseFloat(match[1]);
        let width = parseFloat(match[2]);
        let height = parseFloat(match[3]);

        const isCM = dimensionsString.toLowerCase().includes('cm');

        if (isCM) {
            length = length / 2.54;
            width = width / 2.54;
            height = height / 2.54;
        }

        return { length, width, height };
    }

    calculateSurfaceArea({ length, width, height }) {
        return 2 * (length * width + length * height + width * height);
    }

    async getProductSurfaceArea(asin) {
        const productInfo = await this.getProductInfo(asin);
        if (!productInfo) {
            console.warn('No product information found.');
            return null;
        }

        const dims = this.parseDimensions(productInfo.dimensions);
        if (!dims) return null;

        return {
            surfaceArea: this.calculateSurfaceArea(dims),
            productName: productInfo.titleExcludingVariant
        };
    }
}