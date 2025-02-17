import { IconButton, SearchBox, Stack, StackItem } from '@fluentui/react';
import { AdbShell } from '@yume-chan/adb';
import { encodeUtf8 } from '@yume-chan/adb-backend-webusb';
import { AutoDisposable } from '@yume-chan/event';
import { CSSProperties, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebglAddon } from 'xterm-addon-webgl';
import 'xterm/css/xterm.css';
import { ErrorDialogContext } from '../components/error-dialog';
import { ResizeObserver, withDisplayName } from '../utils';
import { RouteProps, useAdbDevice } from './type';

const ResizeObserverStyle: CSSProperties = {
    width: '100%',
    height: '100%',
};

const UpIconProps = { iconName: 'ChevronUp' };
const DownIconProps = { iconName: 'ChevronDown' };

class AdbTerminal extends AutoDisposable {
    terminal: Terminal = new Terminal({
        scrollback: 9000,
    });

    searchAddon = new SearchAddon();

    private readonly fitAddon = new FitAddon();

    private _parent: HTMLElement | undefined;
    get parent() { return this._parent; }
    set parent(value) {
        this._parent = value;

        if (value) {
            this.terminal.open(value);
            this.terminal.loadAddon(new WebglAddon());
            // WebGL renderer ignores `cursorBlink` set before it initialized
            this.terminal.setOption('cursorBlink', true);
            this.fit();
        }
    }

    private _shell: AdbShell | undefined;
    get socket() { return this._shell; }
    set socket(value) {
        if (this._shell) {
            this.dispose();
        }

        this._shell = value;

        if (value) {
            this.terminal.clear();
            this.terminal.reset();

            this.addDisposable(value.onStdout(data => {
                this.terminal.write(new Uint8Array(data));
            }));
            this.addDisposable(value.onStderr(data => {
                this.terminal.write(new Uint8Array(data));
            }));
            this.addDisposable(this.terminal.onData(data => {
                const buffer = encodeUtf8(data);
                value.write(buffer);
            }));

            this.fit();
        }
    }

    constructor() {
        super();

        this.terminal.setOption('fontFamily', '"Cascadia Code", Consolas, monospace, "Source Han Sans SC", "Microsoft YaHei"');
        this.terminal.setOption('letterSpacing', 1);
        this.terminal.setOption('cursorStyle', 'bar');
        this.terminal.loadAddon(this.searchAddon);
        this.terminal.loadAddon(this.fitAddon);
    }

    fit() {
        this.fitAddon.fit();
        const { rows, cols } = this.terminal;
        this._shell?.resize(rows, cols);
    }
}

export const Shell = withDisplayName('Shell')(({
    visible,
}: RouteProps): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const device = useAdbDevice();
    const terminalRef = useRef(new AdbTerminal());

    const [searchKeyword, setSearchKeyword] = useState('');
    const handleSearchKeywordChange = useCallback((e, newValue?: string) => {
        setSearchKeyword(newValue ?? '');
        if (newValue) {
            terminalRef.current.searchAddon.findNext(newValue, { incremental: true });
        }
    }, []);
    const findPrevious = useCallback(() => {
        terminalRef.current.searchAddon.findPrevious(searchKeyword);
    }, [searchKeyword]);
    const findNext = useCallback(() => {
        terminalRef.current.searchAddon.findNext(searchKeyword);
    }, [searchKeyword]);

    const connectingRef = useRef(false);
    useEffect(() => {
        (async () => {
            if (!device) {
                terminalRef.current.socket = undefined;
                return;
            }

            if (!visible || !!terminalRef.current.socket || connectingRef.current) {
                return;
            }

            try {
                connectingRef.current = true;
                const socket = await device.childProcess.shell();
                terminalRef.current.socket = socket;
            } catch (e) {
                showErrorDialog(e instanceof Error ? e.message : `${e}`);
            } finally {
                connectingRef.current = false;
            }
        })();
    }, [visible, device]);

    const handleContainerRef = useCallback((element: HTMLDivElement | null) => {
        terminalRef.current.parent = element ?? undefined;
    }, []);

    const handleResize = useCallback(() => {
        terminalRef.current.fit();
    }, []);

    return (
        <>
            <StackItem>
                <Stack horizontal>
                    <StackItem grow>
                        <SearchBox
                            placeholder="Find"
                            value={searchKeyword}
                            onChange={handleSearchKeywordChange}
                            onSearch={findNext}
                        />
                    </StackItem>
                    <StackItem>
                        <IconButton
                            disabled={!searchKeyword}
                            iconProps={UpIconProps}
                            onClick={findPrevious}
                        />
                    </StackItem>
                    <StackItem>
                        <IconButton
                            disabled={!searchKeyword}
                            iconProps={DownIconProps}
                            onClick={findNext}
                        />
                    </StackItem>
                </Stack>
            </StackItem>
            <StackItem grow styles={{ root: { minHeight: 0 } }}>
                <ResizeObserver style={ResizeObserverStyle} onResize={handleResize}>
                    <div ref={handleContainerRef} style={{ height: '100%' }} />
                </ResizeObserver>
            </StackItem>
        </>
    );
});
