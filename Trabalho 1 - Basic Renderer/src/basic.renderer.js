(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.BasicRenderer = {}));
}(this, (function (exports) { 'use strict';
        
    function inside(  x, y, primitive  ) {
        switch(primitive.shape){
            //Same validation is being done for both triangles and convex polygons:
            case "polygon":
            case "triangle":
                var vertices = primitive.vertices;
                var sign = 0;
                for (var i = 0; i < vertices.length; i++){
                    var sideVector = nj.array(vertices[(i + 1) % vertices.length]).subtract(vertices[i]);
                    var sideVectorNormal = nj.array([sideVector.get(1), sideVector.get(0) * -1]);
                    var vectorVerticeToPoint = nj.array([x, y]).subtract(vertices[i]);
                    var dotProduct = (vectorVerticeToPoint.get(0) * sideVectorNormal.get(0)) + (vectorVerticeToPoint.get(1) * sideVectorNormal.get(1));
                    if(i == 0) sign = (dotProduct >= 0 ? 1 : -1);
                    else if(dotProduct*sign < 0) return false;
                }
                return true;
            //Circles were already preprocessed into multiple triangles, primitives should never fall into this case!
            case "circle":
                break;
            default:
                break;
        }
        return false
    }

    function getPolygonBoundingBox(polygonPrimitive){
        var minx = polygonPrimitive.vertices[0][0];
        var maxx = polygonPrimitive.vertices[0][0];
        var miny = polygonPrimitive.vertices[0][1];
        var maxy = polygonPrimitive.vertices[0][1];
        for(var vertice of polygonPrimitive.vertices){
            if(minx > vertice[0]) minx = Math.floor(vertice[0]);
            if(maxx < vertice[0]) maxx = Math.ceil(vertice[0]);
            if(miny > vertice[1]) miny = Math.floor(vertice[1]);
            if(maxy < vertice[1]) maxy = Math.ceil(vertice[1]);
        }
        return [[minx, maxx], [miny, maxy]];
    }

    function applyTransformOnVertices(vertices, xform){
        var newVertices = [];
        for( var vertice of vertices){
            var result = [
                (xform[0][0] * vertice[0]) + (xform[0][1] * vertice[1]) + xform[0][2],
                (xform[1][0] * vertice[0]) + (xform[1][1] * vertice[1]) + xform[1][2]
            ]
            newVertices.push(result);
        }
        return newVertices;
    }
        
    
    function Screen( width, height, scene ) {
        this.width = width;
        this.height = height;
        this.scene = this.preprocess(scene);
        console.log(this.scene);
        this.createImage(); 
    }

    Object.assign( Screen.prototype, {

            preprocess: function(scene) {

                var preprop_scene = [];

                for( var primitive of scene ) {
                    if(primitive.shape == "circle"){
                        //Triangulation Preprocessing:
                        var n_triangles = 25;
                        var angToRotate = (2 * Math.PI) / n_triangles;
                        var rotatingVector = [1, 0];
                        for(var i = 0; i < n_triangles; i++){
                            //Defines New Triangle Primitive Properties:
                            var newTrianglePrimitive = {};
                            newTrianglePrimitive.shape = "triangle";
                            newTrianglePrimitive.vertices = [];
                            newTrianglePrimitive.color = primitive.color;

                            //Pushes Vertices to Primitive Vertices Array:
                            newTrianglePrimitive.vertices.push(primitive.center);
                            newTrianglePrimitive.vertices.push([primitive.center[0] + (primitive.radius * rotatingVector[0]), primitive.center[1] + (primitive.radius * rotatingVector[1])]);
                            rotatingVector =
                                [rotatingVector[0] * Math.cos(angToRotate) - rotatingVector[1] * Math.sin(angToRotate),
                                rotatingVector[0] * Math.sin(angToRotate) + rotatingVector[1] * Math.cos(angToRotate)];
                            newTrianglePrimitive.vertices.push([primitive.center[0] + (primitive.radius * rotatingVector[0]), primitive.center[1] + (primitive.radius * rotatingVector[1])]);
                            
                            //Transform Preprocessing:
                            if(primitive.hasOwnProperty("xform"))
                                newTrianglePrimitive.vertices = applyTransformOnVertices(newTrianglePrimitive.vertices, primitive.xform);

                            //Bounding Box Triangle Preprocessing:
                            newTrianglePrimitive.boundingbox = getPolygonBoundingBox(newTrianglePrimitive);

                            //Pushes Triangle Primitive to Preprocessed Scene:
                            preprop_scene.push( newTrianglePrimitive );
                        }
                    }
                    else{
                        //Transform Preprocessing:
                        if(primitive.hasOwnProperty("xform"))
                            primitive.vertices = applyTransformOnVertices(primitive.vertices, primitive.xform);

                        //Bounding Box Preprocessing:
                        primitive.boundingbox = getPolygonBoundingBox(primitive);

                        //Pushes Polygon Primitive to Preprocessed Scene:
                        preprop_scene.push( primitive );
                    }
                    
                }
                return preprop_scene;
            },

            createImage: function() {
                this.image = nj.ones([this.height, this.width, 3]).multiply(255);
            },

            rasterize: function() {
                var color;
                // In this loop, the image attribute must be updated after the rasterization procedure.
                for( var primitive of this.scene ) {
                    // Loop through all pixels inside primitive bonding box
                    for (var i = primitive.boundingbox[0][0]; i < primitive.boundingbox[0][1]; i++) {
                        var x = i + 0.5;
                        for( var j = primitive.boundingbox[1][0]; j < primitive.boundingbox[1][1]; j++) {
                            var y = j + 0.5;
                            // First, we check if the pixel center is inside the primitive 
                            if ( inside( x, y, primitive ) ) {
                                color = nj.array(primitive.color);
                                this.set_pixel( i, this.height - (j + 1), color );
                            }
                        }
                    }
                }
            },

            set_pixel: function( i, j, colorarr ) {
                this.image.set(j, i, 0,    colorarr.get(0));
                this.image.set(j, i, 1,    colorarr.get(1));
                this.image.set(j, i, 2,    colorarr.get(2));
            },

            update: function () {
                // Loading HTML element
                var $image = document.getElementById('raster_image');
                $image.width = this.width; $image.height = this.height;

                // Saving the image
                nj.images.save( this.image, $image );
            }
        }
    );

    exports.Screen = Screen;
    
})));

