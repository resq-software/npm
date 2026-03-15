# Copyright 2026 ResQ
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

{
  description = "ResQ UI — shadcn-based shared component library";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { self, nixpkgs, flake-utils, ... }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      mkDevShell = pkgs: system:
        let
          devPackages = with pkgs; [
            nodejs_22
            bun
            git
            ripgrep
            fd
            osv-scanner
          ];

          shellHook = ''
            echo "--- ResQ UI Dev Environment (${system}) ---"

            version_check() {
              local cmd="$1" name="$2"
              if command -v "$cmd" >/dev/null 2>&1; then
                echo "$name: $("$cmd" --version 2>/dev/null | head -n1 | xargs)"
              else
                echo "$name: NOT FOUND"
              fi
            }

            version_check node "Node"
            version_check bun  "Bun"

            echo ""
            echo "Dev (Storybook):  bun storybook"
            echo "Build (library):  bun build"
            echo "Build (stories):  bun build-storybook"
            echo "Test:             bun test"
            echo "Lint:             bun lint"
            echo "Docker (stories): docker build -t resq-ui-storybook ."
            echo "------------------------------------------"
          '';
        in
        {
          default = pkgs.mkShell {
            packages = devPackages;
            inherit shellHook;
          };
        };
    in
    flake-utils.lib.eachSystem supportedSystems (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
      in
      {
        formatter = pkgs.alejandra or pkgs.nixpkgs-fmt;
        devShells = mkDevShell pkgs system;
      }
    );
}
