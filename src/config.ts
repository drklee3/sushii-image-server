import * as fs from "fs";
import * as Types from "./types";

interface Config {
    interface?: string;
    port?: number;

    headless?: boolean;
    browserArgs?: string;

    width?: string;
    height?: string;

    imageFormat?: Types.ImageFormat;
    quality?: number;
}

export default class ConfigReader {
    config: Config;
    
    constructor(location = "./config.json") {
        this._readConfig(location);
    }

    _readConfig(location: string) {
        try {
            this.config = JSON.parse(fs.readFileSync(location, "utf8"));
        } catch (err) {
            if (err.code === "ENOENT") {
                console.log("Config not found, using default values");
            } else {
                console.log("Something went wrong reading config file");
            }
        }
    }

    /**
     * Gets the option if the background browser should run headless
     */
    isHeadless(): boolean {
        if (this.config && this.config.headless !== undefined) {
            return this.config.headless;
        }

        return true;
    }

    /**
     * Gets the chromium browser args from config
     */
    getBrowserArgs(): string[] {
        if (this.config && this.config.browserArgs !== undefined) {
            return this.config.browserArgs.split(" ");
        }

        return [];
    }

    /**
     * Gets the HTTP server interface
     */
    _getInterface(): string {
        if (this.config && this.config.interface !== undefined) {
            return this.config.interface;
        }

        // default run on localhost, don't want to expose publicly
        return "127.0.0.1";
    }

    /**
     * Gets the HTTP server port
     */
    _getPort(): number {
        if (this.config && this.config.port !== undefined) {
            return this.config.port;
        }

        return 3000;
    }

    /**
     * Gets the interface and port of the HTTP server
     */
    getInterfacePort() {
        const interfacePort: Types.InterfacePort = {
            interface: this._getInterface(),
            port: this._getPort(),
        };

        return interfacePort;
    }

    /**
     * Gets the image format for the response
     * 
     * @param body HTTP request body
     */
    _getImageFormat(body: Types.Body): string {
        let {imageFormat} = body;
        // post body type
        if (imageFormat !== undefined) {
            return imageFormat;
        }

        // config type
        if (this.config && this.config.imageFormat !== undefined) {
            return this.config.imageFormat;
        }

        // none given in args or config
        return "png";
    }

    /**
     * Checks if a given format is valid
     * 
     * @param value Format value to test
     */
    _isValidFormat(value: string): value is Types.ImageFormat {
        const allowedFormats: string[] = ["png", "jpeg"];

        return allowedFormats.indexOf(value) !== -1;
    }

    /**
     * Gets the validated image format for the response
     * 
     * @param body HTTP request body
     * @returns    Image format
     */
    getImageFormat(body: Types.Body): Types.ImageFormat {
        let type = this._getImageFormat(body);
        // its jpeg not jpg bruh
        // https://tools.ietf.org/html/rfc3745, https://www.w3.org/Graphics/JPEG/
        if (type === "jpg") {
            type = "jpeg";
        }

        if (!this._isValidFormat(type)) {
            throw new TypeError("Invalid type given");
        }

        return type as Types.ImageFormat;
    }

    /**
     * Gets the Content-Type for the response
     * 
     * @param body HTTP request body
     * @returns    Response Type
     */
    getResponseType(body: Types.Body): Types.ResponseType {
        const type = this.getImageFormat(body);
        const responseType = `image/${type}`;
        
        return responseType as Types.ResponseType;
    }

    /**
     * Gets a single image and view port dimension
     * 
     * @param value Value of a single dimension
     * @param dim   Dimension to look up (width / height)
     * @returns     A single image / viewport dimension
     */
    _getDimension(value: string, dim: Types.Dimension): number {
        if (value !== undefined) {
            return parseInt(value);
        }

        if (this.config && this.config[dim] !== undefined) {
            return parseInt(this.config[dim]);
        }

        return 512;
    }

    /**
     * Gets image and viewport dimensions
     * 
     * @param body HTTP request body
     * @returns    Image / viewport dimensions
     */
    getDimensions(body: Types.Body): Types.Dimensions {
        let {width, height} = body;

        let dimensions: Types.Dimensions = {
            width: this._getDimension(width, "width"),
            height: this._getDimension(height, "height"),
        };

        return dimensions;
    }

    /**
     * Gets quality value for JPEG screenshots
     * @param body HTTP request body
     * @returns    Quality value
     */
    getQuality(body: Types.Body): number {
        let {quality} = body;
        
        if (quality !== undefined) {
            return parseInt(quality);
        }

        if (this.config && this.config.quality !== undefined) {
            return this.config.quality;
        }

        return 70;
    }
};