#!/bin/bash
cd /home/kavia/workspace/code-generation/global-reaction-management-system-23512/admin_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

