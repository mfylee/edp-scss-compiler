/**
 * @file SCSS编译的构建处理器
 * @author mfylee
 */
var edp = require('edp-core');
var array = require('./util/array');
var AbstractProcessor = require('./processor/abstract');
var sass = require('node-sass');

/**
 * SCSS编译的构建处理器
 *
 * @constructor
 * @param {Object} options 初始化参数
 * @param {string} options.entryExtnames 页面入口扩展名列表，`,`分隔的字符串
 */
function SassCompiler( options ) {
    // 默认的入口文件配置
    this.entryFiles = [
        '*.html',
        '*.htm',
        '*.phtml',
        '*.tpl',
        '*.vm',
        '*.js'
    ];

    this.files = [ '*.scss' ];

    AbstractProcessor.call( this, options );

    // 兼容入口老配置`entryExtnames`
    // 建议使用`entryFiles`
    var entryExtnames = this.entryExtnames;
    if (entryExtnames) {
        if ( !Array.isArray( entryExtnames ) ) {
            entryExtnames = entryExtnames.split( /\s*,\s*/ );
        }

        this.entryFiles = array.list2pattern( entryExtnames );
    }
}

SassCompiler.prototype = new AbstractProcessor();

/**
 * 处理器名称
 *
 * @type {string}
 */
SassCompiler.prototype.name = 'SassCompiler';


/**
 * 构建处理
 *
 * @param {FileInfo} file 文件信息对象
 * @param {ProcessContext} processContext 构建环境对象
 * @param {Function} callback 处理完成回调函数
 */
SassCompiler.prototype.process = function ( file, processContext, callback ) {
    // 对scss文件进行编译
    file.outputPath = file.outputPath.replace( /\.scss$/, '.css' );
    processContext.addFileLink( file.path, file.outputPath );

    /**
    var parserOptions = edp.util.extend(
        {},
        {
            paths: [ require( 'path' ).dirname( file.fullPath ) ],
            relativeUrls: true
        },
        this.compileOptions || {}
    );
    */

    try {
        sass.render({
            file: file.fullPath,
            includePaths: this.includePaths || [],
            outputStyle: this.outputStyle || 'compressed'
        }, function (err, result) {
            if (err) {
                throw new Error(err);
            }
            file.setData(result.css.toString());
            callback();
        });
    }
    catch ( ex ) {
        edp.log.fatal('Compile scss failed, file = [%s], msg = [%s]',
            file.path, ex.toString());
        file.outputPath = null;
        callback();
    }
};

/**
 * 构建处理后的行为，替换page和js里对scss资源的引用
 * 
 * @param {ProcessContext} processContext 构建环境对象
 */
SassCompiler.prototype.afterAll = function ( processContext ) {
    var entryFiles = processContext.getFilesByPatterns( this.entryFiles );
    if ( !Array.isArray( entryFiles ) ) {
        return;
    }

    entryFiles.forEach( function ( file ) {
        if ( file.extname == 'js' ) {
            file.setData(
                require( './util/replace-require-resource' )(
                    file.data,
                    'css',
                    function ( resourceId ) {
                        return resourceId.replace( /\.scss$/, '.css' );
                    }
                )
            );
        }
        else {
            // 替换页面入口文件对scss资源的引用
            file.setData(
                require( './util/replace-tag-attribute' )(
                    file.data,
                    'link',
                    'href',
                    function ( value ) {
                        return value.replace(
                            /\.scss($|\?)/,
                            function ( match, q ) {
                                if ( q == '?' ) {
                                    return '.css?';
                                }

                                return '.css';
                            }
                        );
                    }
                )
            );
        }
    });
};


module.exports = exports = SassCompiler;

