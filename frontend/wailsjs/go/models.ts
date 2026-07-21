export namespace main {
	
	export class SaveResult {
	    success: boolean;
	    conflictFile?: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new SaveResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.conflictFile = source["conflictFile"];
	        this.error = source["error"];
	    }
	}

}

